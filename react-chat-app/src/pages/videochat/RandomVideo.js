import React, { useEffect, useRef, useState } from "react";
import "./stuf/div.css";
import "./stuf/loader.css";
import { Box, IconButton } from "@mui/material";
import { useMediaQuery } from "@mui/material";
import { PhoneCall, PhoneDisconnect, Chat } from "phosphor-react";

const LINK = process.env.REACT_APP_LINK_IP;

// ─── Module-level state (survives re-renders) ────────────────────────────────
let calling_clicked = false;
let other = null;           // ID of the user we are trying to connect with
let sessionId = null;       // Unique tag for this pair: "smallerId_largerId"
let connected = false;      // True once ONE peer connection reaches 'connected'

// Two peer connections race — whichever connects first wins
let pcOfferer = null;       // WE sent the offer (we called them)
let pcAnswerer = null;      // THEY sent the offer (they called us)

let localStream = null;
let remoteStream = null;
let my_interval = null;
let ws = null;
// ─────────────────────────────────────────────────────────────────────────────

// Compute a deterministic session ID from two user IDs.
// Both users independently compute the same string.
function makeSessionId(idA, idB) {
  return `${Math.min(idA, idB)}_${Math.max(idA, idB)}`;
}

// ICE + STUN/TURN configuration
const peerConfiguration = {
  iceServers: [
    { urls: ["stun:stun.l.google.com:19302", "stun:stun1.l.google.com:19302"] },
    // Free TURN relay — fallback for users behind strict NAT/firewalls
    {
      urls: "turn:openrelay.metered.ca:80",
      username: "openrelayproject",
      credential: "openrelayproject",
    },
    {
      urls: "turn:openrelay.metered.ca:443",
      username: "openrelayproject",
      credential: "openrelayproject",
    },
  ],
};

function RandomVideo({ user }) {
  const localVideoEl = useRef(null);
  const remoteVideoEl = useRef(null);
  const loader = useRef(null);
  const isMobile = useMediaQuery("(max-width: 1000px)");

  const [online_users, set_online_users] = useState(null);

  // ── Helpers ────────────────────────────────────────────────────────────────

  function getRandomUser(numbers) {
    const others = numbers.filter((item) => item !== user.id);
    if (others.length === 0) return null;
    return others[Math.floor(Math.random() * others.length)];
  }

  // Check if a signaling message belongs to our current session
  function isMySession(data) {
    return (
      calling_clicked &&
      other !== null &&
      data.sessionId === sessionId &&
      data.to === user.id
    );
  }

  // ── Stream display ─────────────────────────────────────────────────────────

  function showRemoteStream(stream) {
    try {
      remoteStream = stream;
      if (remoteVideoEl.current) {
        remoteVideoEl.current.srcObject = stream;
        remoteVideoEl.current.onloadedmetadata = () => {
          remoteVideoEl.current.play();
        };
      }
      if (loader.current) loader.current.style.display = "none";
    } catch (err) {
      console.error("Error showing remote stream:", err);
    }
  }

  // ── Peer connection factory ────────────────────────────────────────────────

  function createPC(role) {
    const pc = new RTCPeerConnection(peerConfiguration);

    // Add local tracks so the remote side receives our stream
    localStream.getTracks().forEach((track) => pc.addTrack(track, localStream));

    // Trickle ICE — send each candidate as it arrives, tagged with sessionId + role
    pc.onicecandidate = (e) => {
      if (e.candidate && ws && ws.readyState === WebSocket.OPEN) {
        ws.send(
          JSON.stringify({
            typeof: "ice_candidate",
            sessionId,
            role,          // "offerer" or "answerer" — tells remote which PC to apply to
            candidate: e.candidate,
            from: user.id,
            to: other,
          })
        );
      }
    };

    // When remote stream arrives, show it
    pc.ontrack = (e) => {
      if (!connected) {
        showRemoteStream(e.streams[0]);
      }
    };

    // ── Perfect Negotiation: race to connect ──────────────────────────────
    // Whichever PC (offerer or answerer) reaches 'connected' first wins.
    // The other PC is immediately closed and discarded.
    pc.onconnectionstatechange = () => {
      console.log(`[${role}] connectionState:`, pc.connectionState);

      if (pc.connectionState === "connected" && !connected) {
        connected = true;
        console.log(`[${role}] WON the race — connection established!`);

        // Close and discard the losing PC
        if (role === "offerer" && pcAnswerer) {
          pcAnswerer.onicecandidate = null;
          pcAnswerer.ontrack = null;
          pcAnswerer.onconnectionstatechange = null;
          pcAnswerer.close();
          pcAnswerer = null;
        } else if (role === "answerer" && pcOfferer) {
          pcOfferer.onicecandidate = null;
          pcOfferer.ontrack = null;
          pcOfferer.onconnectionstatechange = null;
          pcOfferer.close();
          pcOfferer = null;
        }

        clearInterval(my_interval);
      }

      if (
        (pc.connectionState === "failed" ||
          pc.connectionState === "disconnected") &&
        !connected
      ) {
        console.warn(`[${role}] connection failed/disconnected`);
        pc.close();
        if (role === "offerer") pcOfferer = null;
        else pcAnswerer = null;
      }
    };

    return pc;
  }

  // ── Offer (we initiate) ────────────────────────────────────────────────────

  async function create_offer() {
    try {
      pcOfferer = createPC("offerer");
      const offer = await pcOfferer.createOffer();
      await pcOfferer.setLocalDescription(offer);
      ws.send(
        JSON.stringify({
          typeof: "offer",
          sessionId,
          from: user.id,
          to: other,
          offer,
        })
      );
      console.log("[offerer] offer sent");
    } catch (err) {
      console.error("[offerer] create_offer error:", err);
    }
  }

  // ── Answer (they initiated) ────────────────────────────────────────────────

  async function create_answer(offer) {
    try {
      pcAnswerer = createPC("answerer");
      await pcAnswerer.setRemoteDescription(new RTCSessionDescription(offer));
      const answer = await pcAnswerer.createAnswer();
      await pcAnswerer.setLocalDescription(answer);
      ws.send(
        JSON.stringify({
          typeof: "answer",
          sessionId,
          from: user.id,
          to: other,
          answer,
        })
      );
      console.log("[answerer] answer sent");
    } catch (err) {
      console.error("[answerer] create_answer error:", err);
    }
  }

  // ── Handle incoming answer (for our offer) ────────────────────────────────

  async function handle_answer(answer) {
    try {
      if (pcOfferer && pcOfferer.signalingState !== "stable") {
        await pcOfferer.setRemoteDescription(new RTCSessionDescription(answer));
        console.log("[offerer] remote description set from answer");
      }
    } catch (err) {
      console.error("[offerer] handle_answer error:", err);
    }
  }

  // ── Handle ICE candidate ──────────────────────────────────────────────────
  // Use the 'role' tag to apply to the correct PC:
  //   candidate.role === "offerer"  → they sent it from their offerer PC
  //                                 → we apply to our answerer PC (pcAnswerer)
  //   candidate.role === "answerer" → they sent it from their answerer PC
  //                                 → we apply to our offerer PC (pcOfferer)

  function handle_ice(data) {
    const targetPC =
      data.role === "offerer" ? pcAnswerer : pcOfferer;

    if (targetPC) {
      targetPC
        .addIceCandidate(new RTCIceCandidate(data.candidate))
        .catch((err) => console.error("addIceCandidate error:", err));
    }
  }

  // ── WebSocket message handler ─────────────────────────────────────────────

  function setupMessageHandler(socket) {
    socket.onmessage = (e) => {
      const data = JSON.parse(e.data);

      // Online user list — always update regardless of call state
      if (data.typeof === "list_online") {
        set_online_users(data.list);
        return;
      }

      // check_match: someone picked us AND we picked them (mutual)
      if (data.typeof === "check_match") {
        if (
          calling_clicked &&
          data.user_data.id === other &&
          data.other_user.id === user.id
        ) {
          // Mutual match confirmed — both sides now create an offer simultaneously
          // sessionId is already set (we set it when we sent check_match)
          console.log("Mutual match! Both creating offers...");
          clearInterval(my_interval);
          create_offer();
        }
        return;
      }

      // All other messages require session validation
      if (!isMySession(data)) return;

      if (data.typeof === "offer") {
        console.log("Received offer from", data.from);
        create_answer(data.offer);
      } else if (data.typeof === "answer") {
        console.log("Received answer from", data.from);
        handle_answer(data.answer);
      } else if (data.typeof === "ice_candidate") {
        handle_ice(data);
      } else if (data.typeof === "endcall") {
        other = null;
        ending();
      }
    };
  }

  // ── WebSocket connection ──────────────────────────────────────────────────

  const connect_socket = (token) => {
    const wss = new WebSocket(`wss://${LINK}/video_chat/?token=${token}`);

    wss.onopen = () => {
      console.log("WebSocket connected — hit Call to start");
      ws = wss;
      setupMessageHandler(wss); // Set handler AFTER ws is assigned and open
    };

    wss.onerror = (err) => console.error("WebSocket error:", err);
    wss.onclose = () => console.log("WebSocket closed");
  };

  // ── Camera / mic ──────────────────────────────────────────────────────────

  const fetchUserMedia = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: true,
      });
      if (localVideoEl.current) {
        localVideoEl.current.srcObject = stream;
        localVideoEl.current.play().catch(() => { });
      }
      localStream = stream;
    } catch (err) {
      console.error("getUserMedia error:", err);
    }
  };

  // ── Calling (interval) ────────────────────────────────────────────────────

  function calling() {
    if (!online_users || !ws || ws.readyState !== WebSocket.OPEN) return;

    const picked = getRandomUser(online_users);
    if (!picked) return;

    other = picked;
    // Both users compute the same sessionId independently
    sessionId = makeSessionId(user.id, other);

    ws.send(
      JSON.stringify({
        typeof: "check_match",
        other_user: other,
        sessionId,
      })
    );
  }

  // ── End call ──────────────────────────────────────────────────────────────

  function closePC(pc) {
    if (!pc) return;
    pc.onicecandidate = null;
    pc.ontrack = null;
    pc.onconnectionstatechange = null;
    pc.close();
  }

  function ending() {
    if (!calling_clicked) return;
    console.log("Ending call");

    clearInterval(my_interval);

    closePC(pcOfferer);
    closePC(pcAnswerer);
    pcOfferer = null;
    pcAnswerer = null;

    if (remoteStream) {
      remoteStream.getTracks().forEach((t) => t.stop());
      remoteStream = null;
    }

    if (remoteVideoEl.current) remoteVideoEl.current.srcObject = null;
    if (loader.current) loader.current.style.display = "none";

    // Notify the other user
    if (other && ws && ws.readyState === WebSocket.OPEN) {
      ws.send(
        JSON.stringify({
          typeof: "endcall",
          sessionId,
          from: user.id,
          to: other,
        })
      );
    }

    calling_clicked = false;
    connected = false;
    other = null;
    sessionId = null;
  }

  // ── Lifecycle ─────────────────────────────────────────────────────────────

  useEffect(() => {
    const init = async () => {
      await fetchUserMedia();       // Get camera first
      connect_socket(localStorage.getItem("access_token"));
    };
    init();

    return () => {
      clearInterval(my_interval);
      if (ws) ws.close();
      closePC(pcOfferer);
      closePC(pcAnswerer);
      pcOfferer = null;
      pcAnswerer = null;
      if (localStream) {
        localStream.getTracks().forEach((t) => t.stop());
        localStream = null;
      }
      if (remoteStream) {
        remoteStream.getTracks().forEach((t) => t.stop());
        remoteStream = null;
      }
      other = null;
      sessionId = null;
      connected = false;
      calling_clicked = false;
    };
  }, []);

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <Box>
      <div
        style={{
          width: isMobile ? "90vw" : "94vw",
          height: "fit-content",
          display: isMobile ? "block" : "flex",
          margin: "60px 0 0 0",
          justifyContent: "space-around",
        }}
      >
        {/* Remote video */}
        <div
          style={{
            width: isMobile ? "90%" : "40%",
            padding: "10px",
            overflow: "hidden",
            borderRadius: "20px",
            backgroundColor: "black",
            transform: "scaleX(-1)",
            margin: isMobile ? "0 auto 40px auto" : "0 auto",
          }}
        >
          <video
            ref={remoteVideoEl}
            width="100%"
            height={isMobile ? "300px" : "400px"}
            autoPlay
          />
          {/* Loader spinner */}
          <div className="three-body" ref={loader} style={{ display: "none" }}>
            <div className="three-body__dot"></div>
            <div className="three-body__dot"></div>
            <div className="three-body__dot"></div>
          </div>
        </div>

        {/* Local video */}
        <div
          style={{
            width: isMobile ? "90%" : "40%",
            overflow: "hidden",
            padding: "10px",
            borderRadius: "20px",
            backgroundColor: "black",
            margin: isMobile ? "0 auto 10px auto" : "0 auto",
          }}
        >
          {online_users ? online_users.length - 1 : 0}
          <span style={{ marginLeft: "10px" }}>Online</span>
          <video
            ref={localVideoEl}
            width="100%"
            height={isMobile ? "300px" : "400px"}
            style={{ transform: "scaleX(-1)" }}
            autoPlay
            muted
          />
        </div>
      </div>

      {/* Controls */}
      <div
        className="card"
        style={{
          width: isMobile ? "60%" : "20%",
          left: isMobile ? "22.5%" : "42.5%",
        }}
      >
        <IconButton sx={{ backgroundColor: "lightgray" }}>
          <PhoneCall
            onClick={() => {
              if (calling_clicked) return; // prevent double-click
              calling_clicked = true;
              if (loader.current) loader.current.style.display = "block";
              my_interval = setInterval(() => {
                calling();
              }, 500);
            }}
            color="green"
            size={40}
          />
        </IconButton>

        <IconButton sx={{ backgroundColor: "lightgray" }}>
          <PhoneDisconnect
            onClick={() => {
              ending();
            }}
            color="red"
            size={40}
          />
        </IconButton>

        <IconButton sx={{ backgroundColor: "lightgray" }}>
          <Chat size={40} />
        </IconButton>
      </div>
    </Box>
  );
}

export default RandomVideo;

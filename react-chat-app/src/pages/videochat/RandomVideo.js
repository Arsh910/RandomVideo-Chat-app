// src/pages/videochat/RandomVideo.js
import React, { useEffect, useRef, useState } from "react";
import "./stuf/div.css";
import "./stuf/loader.css";
import { Box, IconButton } from "@mui/material";
import { useMediaQuery } from "@mui/material";
import { PhoneCall, PhoneDisconnect, Chat } from "phosphor-react";

const LINK = process.env.REACT_APP_LINK_IP; // e.g. yourdomain.com (no protocol)
const TURN_URL = process.env.REACT_APP_TURN_URL; // e.g. turn:turn.example.com:3478
const TURN_USER = process.env.REACT_APP_TURN_USER;
const TURN_PASS = process.env.REACT_APP_TURN_PASS;

let calling_clicked = false;
let other = null;
let pc = null; // single peer connection for this call (unified)
let localStream = null;
let remoteStream = null;
let my_interval = null;
let ws = null;
let pendingCandidates = []; // buffer before PC exists
let lastSentOffer = null;

function RandomVideo({ user }) {
  const localVideoEl = useRef(null);
  const remoteVideoEl = useRef(null);
  const loader = useRef(null);
  const isMobile = useMediaQuery("(max-width: 1000px)");

  const [online_users, set_online_users] = useState(null);

  function getRandomUser(numbers) {
    if (!numbers || numbers.length === 0) throw new Error("The list is empty.");
    numbers = numbers.filter((item) => item !== user.id);
    const randomIndex = Math.floor(Math.random() * numbers.length);
    return numbers[randomIndex];
  }

  function buildWsURL(token) {
    // choose wss/ws automatically
    const scheme = window.location.protocol === "https:" ? "wss" : "ws";
    // LINK expected as host (domain:port) or domain
    return `${scheme}://${LINK}/video_chat/?token=${token}`;
  }

  async function connect_socket(token) {
    try {
      const url = buildWsURL(token);
      console.log("connecting ws to", url);
      ws = new WebSocket(url);

      // monkey patch send for logging (debug only)
      const origSend = ws.send.bind(ws);
      ws.send = (data) => {
        try {
          console.log("WS send ->", JSON.parse(data));
        } catch (e) {
          console.log("WS send ->", data);
        }
        origSend(data);
      };

      ws.onopen = () => {
        console.log("WS opened");
      };

      ws.onclose = (ev) => {
        console.warn("WS closed", ev);
      };

      ws.onerror = (ev) => {
        console.error("WS error", ev);
      };

      ws.onmessage = (e) => {
        // handle incoming messages
        try {
          const data = JSON.parse(e.data);
          console.log("WS recv <-", data);

          if (data.typeof === "list_online") {
            set_online_users(data.list);
          } else if (data.typeof === "check_match") {
            if (check_match(data)) {
              createOffer();
            }
          } else if (data.typeof === "offer") {
            if (check_match(data)) {
              createAnswer(data.offer);
            }
          } else if (data.typeof === "answer") {
            if (check_match(data)) {
              handleAnswer(data.answer);
            }
          } else if (data.typeof === "ice_candidate") {
            if (check_match(data)) {
              bufferOrApplyRemoteCandidate(data.candidate);
            }
          } else if (data.typeof === "endcall") {
            if (check_match(data)) {
              other = null;
              ending();
            }
          }
        } catch (err) {
          console.error("Failed parsing WS message", err);
        }
      };
    } catch (err) {
      console.error("connect_socket error", err);
    }
  }

  const fetchUserMedia = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: true,
      });
      localStream = stream;
      if (localVideoEl.current) {
        localVideoEl.current.srcObject = stream;
        localVideoEl.current.onloadeddata = () => localVideoEl.current.play();
      }
      console.log("got local stream", stream.getTracks());
    } catch (err) {
      console.error("getUserMedia error", err);
    }
  };

  function check_match(data) {
    try {
      if (data.user_data && data.other_user) {
        return (
          data.user_data.id === other &&
          data.other_user.id === user.id &&
          calling_clicked === true
        );
      } else {
        return data.from === other && data.to === user.id && calling_clicked === true;
      }
    } catch (err) {
      return data.from === other && data.to === user.id && calling_clicked === true;
    }
  }

  function send_match(other_id) {
    if (!ws || ws.readyState !== WebSocket.OPEN) {
      console.warn("WS not open: can't send match");
      return;
    }
    ws.send(
      JSON.stringify({
        typeof: "check_match",
        other_user: other_id,
      })
    );
  }

  // --- Peer configuration (STUN + optional TURN from env) ---
  function buildPeerConfig() {
    const iceServers = [
      { urls: ["stun:stun.l.google.com:19302", "stun:stun1.l.google.com:19302"] },
    ];
    if (TURN_URL && TURN_USER && TURN_PASS) {
      iceServers.push({
        urls: TURN_URL,
        username: TURN_USER,
        credential: TURN_PASS,
      });
    }
    return { iceServers };
  }

  function createPeerConnection() {
    const pcLocal = new RTCPeerConnection(buildPeerConfig());

    pcLocal.ontrack = (e) => {
      remoteStream = e.streams && e.streams[0];
      if (remoteStream && remoteVideoEl.current) {
        remoteVideoEl.current.srcObject = remoteStream;
        remoteVideoEl.current.onloadedmetadata = () => remoteVideoEl.current.play();
        if (loader.current) loader.current.style.display = "none";
      }
      console.log("ontrack got streams", e.streams);
    };

    pcLocal.onicecandidate = (ev) => {
      if (ev.candidate && ws && ws.readyState === WebSocket.OPEN && other) {
        ws.send(
          JSON.stringify({
            typeof: "ice_candidate",
            candidate: ev.candidate,
            from: user.id,
            to: other,
          })
        );
      }
    };

    pcLocal.oniceconnectionstatechange = () => {
      console.log("ICE state:", pcLocal.iceConnectionState);
    };

    // attach local tracks if available
    if (localStream) {
      try {
        localStream.getTracks().forEach((track) => pcLocal.addTrack(track, localStream));
      } catch (e) {
        console.warn("addTrack failed:", e);
      }
    } else {
      console.warn("createPeerConnection: localStream not ready");
    }

    return pcLocal;
  }

  // buffer candidate if pc not ready
  function bufferOrApplyRemoteCandidate(candidate) {
    if (!candidate) return;
    const rtcCandidate = new RTCIceCandidate(candidate);
    if (pc) {
      pc
        .addIceCandidate(rtcCandidate)
        .then(() => console.log("Added remote candidate"))
        .catch((e) => console.warn("addIceCandidate failed", e));
    } else {
      pendingCandidates.push(rtcCandidate);
      console.log("Buffered remote candidate, queue length:", pendingCandidates.length);
    }
  }

  // apply pending candidates after pc setRemoteDescription or pc created
  function applyPendingCandidates() {
    if (!pendingCandidates.length || !pc) return;
    pendingCandidates.forEach((cand) => {
      pc.addIceCandidate(cand).catch((e) => console.warn("applyPendingCandidates failed", e));
    });
    pendingCandidates = [];
  }

  // Create offer flow (initiator)
  async function createOffer() {
    try {
      if (!localStream) {
        console.error("createOffer: localStream not ready");
        return;
      }
      clearInterval(my_interval);

      other = other || other; // already set by calling()
      pc = createPeerConnection();

      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      lastSentOffer = pc.localDescription;

      if (!ws || ws.readyState !== WebSocket.OPEN) {
        console.error("WS not open: cannot send offer");
        return;
      }

      ws.send(
        JSON.stringify({
          typeof: "offer",
          to: other,
          from: user.id,
          offer: pc.localDescription,
        })
      );

      applyPendingCandidates();
    } catch (err) {
      console.error("createOffer error", err);
    }
  }

  // Create answer flow (receiver)
  async function createAnswer(offer) {
    try {
      if (!localStream) {
        console.error("createAnswer: localStream not ready");
        return;
      }
      clearInterval(my_interval);

      pc = createPeerConnection();

      // set remote description (incoming offer)
      await pc.setRemoteDescription(new RTCSessionDescription(offer));
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);

      if (!ws || ws.readyState !== WebSocket.OPEN) {
        console.error("WS not open: cannot send answer");
        return;
      }

      ws.send(
        JSON.stringify({
          typeof: "answer",
          from: user.id,
          to: other,
          answer: pc.localDescription,
        })
      );

      applyPendingCandidates();
    } catch (err) {
      console.error("createAnswer error", err);
    }
  }

  function handleAnswer(answer) {
    if (!pc) {
      console.warn("handleAnswer: pc not ready yet, buffering answer not implemented");
      return;
    }
    pc
      .setRemoteDescription(new RTCSessionDescription(answer))
      .then(() => {
        console.log("setRemoteDescription(answer) OK");
        applyPendingCandidates();
      })
      .catch((e) => console.error("setRemoteDescription(answer) failed", e));
  }

  // lifecycle: load socket & media
  useEffect(() => {
    (async function init() {
      await connect_socket(localStorage.getItem("access_token"));
      await fetchUserMedia();
    })();

    return () => {
      if (ws) {
        try {
          ws.close();
        } catch {}
      }
      if (localStream) {
        localStream.getTracks().forEach((t) => t.stop());
        localStream = null;
      }
      if (remoteStream) {
        remoteStream.getTracks().forEach((t) => t.stop());
        remoteStream = null;
      }
      if (pc) {
        pc.close();
        pc = null;
      }
      calling_clicked = false;
      other = null;
      pendingCandidates = [];
    };
  }, []);

  function calling() {
    calling_clicked = true;
    if (online_users && calling_clicked) {
      const other_user = getRandomUser(online_users);
      other = other_user;
      if (other) send_match(other);
    }
  }

  function notify_other_client() {
    if (!ws || ws.readyState !== WebSocket.OPEN || !other) return;
    ws.send(
      JSON.stringify({
        typeof: "endcall",
        from: user.id,
        to: other,
      })
    );
    other = null;
  }

  function ending() {
    if (!calling_clicked) return;
    console.log("ending call");
    calling_clicked = false;

    if (pc) {
      try {
        pc.ontrack = null;
        pc.onicecandidate = null;
        pc.close();
      } catch (e) {}
      pc = null;
    }

    if (remoteStream) {
      try {
        remoteStream.getTracks().forEach((t) => t.stop());
      } catch {}
      remoteStream = null;
    }

    if (loader.current) loader.current.style.display = "none";

    if (other) {
      notify_other_client();
      other = null;
    }
  }

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
            src=""
            autoPlay
          />
          <div className="three-body" ref={loader}>
            <div className="three-body__dot"></div>
            <div className="three-body__dot"></div>
            <div className="three-body__dot"></div>
          </div>
        </div>

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
            src=""
            autoPlay
            muted
          />
        </div>
      </div>

      <div className="card" style={{ width: isMobile ? "60%" : "20%", left: isMobile ? "22.5%" : "42.5%" }}>
        <IconButton sx={{ backgroundColor: "lightgray" }}>
          <PhoneCall
            onClick={() => {
              my_interval = setInterval(() => {
                calling();
              }, 500);
              if (loader.current) loader.current.style.display = "block";
            }}
            color="green"
            size={40}
          />
        </IconButton>

        <IconButton sx={{ backgroundColor: "lightgray" }}>
          <PhoneDisconnect onClick={() => { ending(); }} color="red" size={40} />
        </IconButton>

        <IconButton sx={{ backgroundColor: "lightgray" }}>
          <Chat size={40} />
        </IconButton>
      </div>
    </Box>
  );
}

export default RandomVideo;

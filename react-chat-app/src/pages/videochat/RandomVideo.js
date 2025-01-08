import React, { useEffect, useRef, useState } from "react";
import "./stuf/div.css";
import "./stuf/loader.css";
import {Box,IconButton,} from '@mui/material';
import { useMediaQuery } from '@mui/material';
import { PhoneCall ,  PhoneDisconnect , Chat} from "phosphor-react";

const LINK = process.env.REACT_APP_LINK_IP

let calling_clicked = false;
let other = null;
let peerConnection = null;
let peerConnection2 = null;
let localStream = null;
let remoteStream = null;
let my_interval = null;
let ws = null;

function RandomVideo({ user }) {
  const localVideoEl = useRef(null);
  const remoteVideoEl = useRef(null);
  const loader = useRef(null);
  const isMobile = useMediaQuery('(max-width: 1000px)');

  // start
  const [online_users, set_online_users] = useState(null);

  function getRandomUser(numbers) {
    if (numbers.length === 0) {
      throw new Error("The list is empty. Provide a list with numbers.");
    }
    numbers = numbers.filter((item) => item !== user.id);
    const randomIndex = Math.floor(Math.random() * numbers.length);
    return numbers[randomIndex];
  }

  const connect_socket = (token) => {
    const wss = new WebSocket(`ws://${LINK}/video_chat/?token=${token}`);
    wss.onopen = () => {
      console.log("you are connected , just hit call");
    };
    ws = wss;
    setrecieve_event();
  };

  const fetchUserMedia = async () => {
    try {
      // console.log("setting stream for this user");
      const stream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: true,
      });
      if (localVideoEl.current) {
        localVideoEl.current.srcObject = stream;
        localVideoEl.current.onloadeddata = () => {
          localVideoEl.current.play();
        };
      }
      localStream = stream;
    } catch (err) {
      console.log(err);
    }
  };

  function check_match(data) {
    // console.log("checking match");
    try {
      if (
        data.user_data.id === other &&
        data.other_user.id === user.id &&
        calling_clicked === true
      ) {
        return true;
      }
    } catch {
      if (data.from === other && data.to === user.id && calling_clicked === true) {
        return true;
      }
    }
    return false;
  }

  function send_match(other) {
    if (other) {
      ws.send(
        JSON.stringify({
          typeof: "check_match",
          other_user: other,
        })
      );
    }
  }

  // webrtc logic

  let peerConfiguration = {
    iceServers: [
      {
        urls: ["stun:stun.l.google.com:19302", "stun:stun1.l.google.com:19302"],
      },
    ],
  };

  function create_peerconnection() {
    const peerCon = new RTCPeerConnection(peerConfiguration);
    peerCon.ontrack = OnTrackFunc;
    peerCon.onicecandidate = OnIceCandidateFunc;

    localStream.getTracks().forEach((track) => {
      peerCon.addTrack(track, localStream);
    });

    return peerCon;
  }

  async function create_offer() {
    try {
      // console.log("Creating offer...");
      clearInterval(my_interval);
      peerConnection = await create_peerconnection();
      const offer = await peerConnection.createOffer();
      peerConnection.setLocalDescription(offer);
      ws.send(
        JSON.stringify({
          typeof: "offer",
          to: other,
          from: user.id,
          offer: offer,
        })
      );
    } catch (error) {
      console.error(`something wrong in create_offer`);
    }
  }

  async function create_answer(offer) {
    try {
      if (offer) {
        clearInterval(my_interval);
        peerConnection2 = await create_peerconnection();
        // console.log("creating answer...");
        peerConnection2.setRemoteDescription(offer);
        const answer = await peerConnection2.createAnswer({});
        peerConnection2.setLocalDescription(answer);

        ws.send(
          JSON.stringify({
            typeof: "answer",
            from: user.id,
            to: other,
            answer: answer,
          })
        );
      }
    } catch (error) {
      console.error(`something wrong in create_answer`);
    }
  }

  function handle_answer(answer) {
    peerConnection.setRemoteDescription(answer);
  }

  function OnIceCandidateFunc(e) {
    if (e.candidate && ws) {
      // console.log("sending ice candidates");
      ws.send(
        JSON.stringify({
          typeof: "ice_candidate",
          candidate: e.candidate,
          from: user.id,
          to: other,
        })
      );
    }
  }

  function OnTrackFunc(e) {
    // console.log("setting stream for remote user");
    try {
      remoteStream = e.streams[0];
      if (remoteStream && remoteVideoEl) {
        remoteVideoEl.current.srcObject = remoteStream;
        remoteVideoEl.current.onloadedmetadata = () => {
          remoteVideoEl.current.play();
        };
        loader.current.style.display = "none";
      }
    } catch (error) {
      console.error(`Error setting remote stream:`);
    }
  }

  function handle_ice(ice, peerCon) {
    if (peerCon) {
      // console.log("adding icecandidates");
      peerCon.addIceCandidate(ice).catch((error) => {
        console.error("Error adding ICE candidate:");
      });
    }
  }

  // recieving from socket
  function setrecieve_event(){
    if (ws) {
        ws.onmessage = function (e) {
        const data = JSON.parse(e.data);

        if (data.typeof === "list_online") {
            // console.log("setting list");
            set_online_users(data.list);
        }
        if (data.typeof === "check_match") {
            if (check_match(data)) {
            create_offer();
            }
        }
        if (data.typeof === "offer") {
            if (check_match(data)) {
            create_answer(data.offer);
            }
        }
        if (data.typeof === "answer") {
            if (check_match(data)) {
            handle_answer(data.answer);
            }
        }
        if (data.typeof === "ice_candidate") {
            if (check_match(data)) {
            handle_ice(data.candidate, peerConnection);
            handle_ice(data.candidate, peerConnection2);
            }
        }
        if (data.typeof === "endcall") {
            if (check_match(data)) {
            other = null;
            ending();
            }
        }
        };
    }
  }

  // setting up stuff when page loads
  useEffect(() => {
    const init = async () => {
      await connect_socket(localStorage.getItem("access_token"));
      await fetchUserMedia();
    };
    init();
    // Clean up the camera when the component unmounts
    return () => {
      if (ws) {
        ws.close();
      }
      if (localStream) {
        localStream.getTracks().forEach((track) => track.stop());
        localStream = null;
      }
      if (remoteStream) {
        remoteStream.getTracks().forEach((track) => track.stop());
        remoteStream = null;
      }
      other = null;
      peerConnection = null;
      peerConnection2 = null;
    };
  },[]);

  // setting up selected user to connect with
  function calling() {
    calling_clicked = true;
    if (online_users && calling_clicked) {
      console.log("calling");
      let other_user = getRandomUser(online_users);
      other = other_user;
      if (other) {
        // console.log("sending match");
        send_match(other);
      }
    }
  }

  function notify_other_client() {
    ws.send(
      JSON.stringify({
        typeof: "endcall",
        from: user.id,
        to: other,
      })
    );
    other = null;
  }

  // ending the call
  function ending() {
    if (calling_clicked === true) {
      console.log("ending");
      // Remove Icecandidates and close peerConnection
      if (peerConnection2) {
        peerConnection2.onicecandidate = null;
        peerConnection2.ontrack = null;
        peerConnection2.close();
        peerConnection2 = null;
      }

      if (peerConnection) {
        peerConnection.onicecandidate = null;
        peerConnection.ontrack = null;
        peerConnection.close();
        peerConnection = null;
      }

      // Stop mediaStream
      if (remoteStream) {
        remoteStream.getTracks().forEach((track) => track.stop());
        remoteStream = null;
      }

      // set clicked to false
      calling_clicked = false;

      // loader stop
      loader.current.style.display = "none";

      // notify other client about call end and set other to null
      if (other) {
        notify_other_client();
      }
    }
  }

  return (
    <Box>

    <div style={{           
        width: isMobile? "90vw" : "95vw",
        height: "fit-content",
        display: isMobile? "block" : "flex",
        margin:"60px 0 0 0",
        justifyContent: "space-around",
    }}>
        
        <div
          style={{
            width: isMobile?"90%":"40%",
            padding:"10px",
            overflow: "hidden",
            borderRadius: "20px",
            backgroundColor: "black",
            transform: "scaleX(-1)",
            margin:isMobile?"0 auto 40px auto":"0 auto"
          }}
        >
          <video ref={remoteVideoEl} width="100%" height={isMobile?"300px":"400px"} src="" autoPlay />

          {/* loader */}
          <div class="three-body" ref={loader}>
            <div class="three-body__dot"></div>
            <div class="three-body__dot"></div>
            <div class="three-body__dot"></div>
          </div>

        </div>
        
        <div
          style={{
            width: isMobile?"90%":"40%",
            overflow: "hidden",
            padding:"10px",
            borderRadius: "20px",
            backgroundColor: "black",
            margin:isMobile?"0 auto 10px auto":"0 auto"
          }}
        >
            {online_users ? online_users.length-1 : 0} 
            <span style={{marginLeft:"10px"}}>Online</span>
          <video ref={localVideoEl} width="100%" height={isMobile?"300px":"400px"} style={{transform: "scaleX(-1)"}} src="" autoPlay muted />
        </div>

    </div>
    
    <div
        className="card"
        style={{width: isMobile? "60%" : "20%", left: isMobile?"22.5%":"42.5%"}}
      >
        <IconButton sx={{backgroundColor:"lightgray"}}>
        <PhoneCall 
            onClick={()=>{
                my_interval = setInterval(() => {
                    calling();
                }, 500);
                loader.current.style.display = "block";
            }} 
            color='green'
            size={40}
            />
        </IconButton>

        <IconButton sx={{backgroundColor:"lightgray"}}>
        <PhoneDisconnect 
            onClick={()=>{ending();}}
            color='red'
            size={40}
            />
        </IconButton>

        <IconButton sx={{backgroundColor:"lightgray"}}>
            <Chat
            size={40}
            />
        </IconButton>

    </div>
     
    </Box>
  );
}

export default RandomVideo;

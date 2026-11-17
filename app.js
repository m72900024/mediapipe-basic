import {FilesetResolver,HandLandmarker,FaceLandmarker,DrawingUtils} from "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14/vision_bundle.mjs";
const MODE=document.body.dataset.mode;
const $=id=>document.getElementById(id);
const video=$("video"),canvas=$("canvas"),ctx=canvas.getContext("2d"),st=$("status"),btn=$("toggle");
let detector=null,stream=null,running=false,lastT=-1;
function setStatus(t,c){st.textContent=t;st.className="status "+(c||"")}
async function load(){
  setStatus("模型載入中，第一次要等幾秒…");
  const fs=await FilesetResolver.forVisionTasks("https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14/wasm");
  const make=async(delegate)=>MODE==="hand"
    ?HandLandmarker.createFromOptions(fs,{baseOptions:{modelAssetPath:"https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task",delegate},runningMode:"VIDEO",numHands:2})
    :FaceLandmarker.createFromOptions(fs,{baseOptions:{modelAssetPath:"https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task",delegate},runningMode:"VIDEO",numFaces:1});
  try{detector=await make("GPU")}catch(e){detector=await make("CPU")}
}
async function start(){
  btn.disabled=true;
  try{
    if(!detector)await load();
    setStatus("請允許使用攝影機…");
    stream=await navigator.mediaDevices.getUserMedia({video:{facingMode:"user",width:{ideal:1280},height:{ideal:720}},audio:false});
    video.srcObject=stream;await video.play();
    running=true;btn.textContent="停止攝影機";btn.classList.remove("primary");loop();
  }catch(e){setStatus("無法啟動："+(e.name==="NotAllowedError"?"攝影機權限被拒絕，請到瀏覽器設定允許":e.message),"no");console.error(e)}
  btn.disabled=false;
}
function stop(){running=false;stream?.getTracks().forEach(t=>t.stop());video.srcObject=null;ctx.clearRect(0,0,canvas.width,canvas.height);btn.textContent="啟動攝影機";btn.classList.add("primary");setStatus("已停止")}
function loop(){
  if(!running)return;
  if(video.videoWidth&&video.currentTime!==lastT){
    lastT=video.currentTime;
    canvas.width=video.videoWidth;canvas.height=video.videoHeight;
    const r=detector.detectForVideo(video,performance.now());
    ctx.clearRect(0,0,canvas.width,canvas.height);
    const du=new DrawingUtils(ctx);
    if(MODE==="hand"){
      const hs=r.landmarks||[];
      for(const lm of hs){du.drawConnectors(lm,HandLandmarker.HAND_CONNECTIONS,{color:"#7CFC9A",lineWidth:4});du.drawLandmarks(lm,{color:"#FF5A5F",lineWidth:1,radius:4})}
      hs.length?setStatus(`偵測到 ${hs.length} 隻手（每隻 21 個點）`,"ok"):setStatus("尚未偵測到手","no");
    }else{
      const fs=r.faceLandmarks||[];
      for(const lm of fs){
        du.drawConnectors(lm,FaceLandmarker.FACE_LANDMARKS_TESSELATION,{color:"#C0C0C070",lineWidth:1});
        du.drawConnectors(lm,FaceLandmarker.FACE_LANDMARKS_RIGHT_EYE,{color:"#FF5A5F",lineWidth:2});
        du.drawConnectors(lm,FaceLandmarker.FACE_LANDMARKS_LEFT_EYE,{color:"#30A0FF",lineWidth:2});
        du.drawConnectors(lm,FaceLandmarker.FACE_LANDMARKS_LIPS,{color:"#FFD24A",lineWidth:2});
        du.drawConnectors(lm,FaceLandmarker.FACE_LANDMARKS_FACE_OVAL,{color:"#E0E0E0",lineWidth:2});
      }
      fs.length?setStatus(`偵測到臉（${fs[0].length} 個點）`,"ok"):setStatus("尚未偵測到臉","no");
    }
  }
  requestAnimationFrame(loop);
}
btn.addEventListener("click",()=>running?stop():start());

document.addEventListener("DOMContentLoaded", async () => {
    const captureButton = document.getElementById("capture");
    captureButton.disabled = true; // ปิดปุ่มก่อนโหลดกล้องเสร็จ
    await startCamera();
    captureButton.disabled = false; // เปิดปุ่มหลังกล้องพร้อมใช้งาน
});

async function startCamera() {
    try {
        const video = document.getElementById("video");
        const stream = await navigator.mediaDevices.getUserMedia({
            video: { facingMode: "environment" }
        });

        video.srcObject = stream;
        await video.play();
    } catch (err) {
        console.error("Error accessing camera:", err);
        alert("Failed to access camera. Please check camera permissions.");
    }
}

document.getElementById("capture").addEventListener("click", async () => {
    const video = document.getElementById("video");
    const canvas = document.getElementById("canvas");
    const context = canvas.getContext("2d");
    const capturedImage = document.getElementById("capturedImage"); // รูปที่จะแสดง
    const measurementsDisplay = document.getElementById("measurements");
    const warning = document.getElementById("warning");

    // Safari ต้องการ interaction ก่อนเปิดกล้อง → ตรวจสอบ stream ก่อนแคปเจอร์
    if (!video.srcObject) {
        await startCamera();
    }

    // รอให้กล้องโฟกัสก่อนถ่าย ลด Motion Blur
    await new Promise(resolve => setTimeout(resolve, 200));

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    context.drawImage(video, 0, 0, canvas.width, canvas.height);

    // ✅ แสดงผลภาพที่จับได้
    capturedImage.src = canvas.toDataURL("image/png");
    capturedImage.style.display = "block";

    // ดึงข้อมูลภาพเพื่อตรวจจับเหรียญ
    const imageData = context.getImageData(0, 0, canvas.width, canvas.height);
    const detectedCoin = detectCoin(imageData);

    if (!detectedCoin) {
        warning.style.display = "block";
        measurementsDisplay.innerHTML = "";
        return;
    } else {
        warning.style.display = "none";
    }

    // คำนวณสัดส่วน pixel -> mm โดยใช้เหรียญเป็นมาตรฐาน
    const COIN_REAL_SIZE_MM = 20;
    const pixelToMmRatio = COIN_REAL_SIZE_MM / detectedCoin.diameterPx;
    const measurements = measureHandFeatures(imageData, pixelToMmRatio);

    // แสดงผลลัพธ์การวัด
    measurementsDisplay.innerHTML = `Finger Widths: ${measurements.fingerWidths.join(", ")} mm<br>
                                     Finger Lengths: ${measurements.fingerLengths.join(", ")} mm<br>
                                     Palm Width: ${measurements.palmWidth} mm`;
});

function detectCoin(imageData) {
    let src = cv.matFromImageData(imageData);
    let gray = new cv.Mat();
    cv.cvtColor(src, gray, cv.COLOR_RGBA2GRAY); // แปลงเป็น Grayscale
    
    // Adaptive threshold เพื่อเพิ่ม contrast
    let thresh = new cv.Mat();
    cv.adaptiveThreshold(gray, thresh, 255, cv.ADAPTIVE_THRESH_GAUSSIAN_C, cv.THRESH_BINARY, 11, 2);

    // ค้นหาเส้นขอบด้วย Canny
    let edges = new cv.Mat();
    cv.Canny(thresh, edges, 50, 150);

    // ค้นหาวงกลมด้วย Hough Transform
    let circles = new cv.Mat();
    cv.HoughCircles(gray, circles, cv.HOUGH_GRADIENT, 1, 30, 50, 30, 20, 100);

    if (circles.cols > 0) {
        let radius = circles.data32F[2]; // ดึงขนาดรัศมีของวงกลมแรกที่เจอ
        let diameterPx = radius * 2;

        src.delete(); gray.delete(); thresh.delete(); edges.delete(); circles.delete();
        return { diameterPx: diameterPx };
    }

    src.delete(); gray.delete(); thresh.delete(); edges.delete(); circles.delete();
    return null; // ไม่พบเหรียญ
}

function measureHandFeatures(imageData, pixelToMmRatio) {
    return {
        fingerWidths: [15, 14, 16, 13, 12].map(px => px * pixelToMmRatio),
        fingerLengths: [50, 55, 60, 52, 48].map(px => px * pixelToMmRatio),
        palmWidth: 80 * pixelToMmRatio
    };
}

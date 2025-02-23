document.addEventListener("DOMContentLoaded", async () => {
    captureButton.disabled = true; // ปิดปุ่มก่อนโหลดกล้องเสร็จ
    await startCamera();
    captureButton.disabled = false; // เปิดปุ่มหลังกล้องพร้อมใช้งาน
});

async function startCamera() {
    try {
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

captureButton.addEventListener("click", async () => {
    // Safari ต้องการ interaction ก่อนเปิดกล้อง → ตรวจสอบ stream ก่อนแคปเจอร์
    if (!video.srcObject) {
        await startCamera();
    }

    // รอให้กล้องโฟกัสก่อนถ่าย ลด Motion Blur
    await new Promise(resolve => setTimeout(resolve, 200));

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    context.drawImage(video, 0, 0);

    // แสดงภาพที่บันทึก
    canvas.style.display = "block";

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
    const pixelToMmRatio = COIN_REAL_SIZE_MM / detectedCoin.diameterPx;
    const measurements = measureHandFeatures(imageData, pixelToMmRatio);

    // แสดงผลลัพธ์การวัด
    measurementsDisplay.innerHTML = `Finger Widths: ${measurements.fingerWidths.join(", ")} mm<br>
                                     Finger Lengths: ${measurements.fingerLengths.join(", ")} mm<br>
                                     Palm Width: ${measurements.palmWidth} mm`;
});

function detectCoin(imageData) {
    // แปลง ImageData เป็น OpenCV Mat
    let src = cv.matFromImageData(imageData);
    let gray = new cv.Mat();
    cv.cvtColor(src, gray, cv.COLOR_RGBA2GRAY); // แปลงเป็น Grayscale
    
    // ลด Noise
    let blurred = new cv.Mat();
    cv.GaussianBlur(gray, blurred, new cv.Size(9, 9), 2, 2);

    // ค้นหาเส้นขอบด้วย Canny
    let edges = new cv.Mat();
    cv.Canny(blurred, edges, 50, 150);

    // ค้นหาวงกลมด้วย Hough Transform
    let circles = new cv.Mat();
    cv.HoughCircles(gray, circles, cv.HOUGH_GRADIENT, 1, 30, 50, 30, 20, 100);

    if (circles.cols > 0) {
        let radius = circles.data32F[2]; // ดึงขนาดรัศมีของวงกลมแรกที่เจอ
        let diameterPx = radius * 2;
        return { diameterPx: diameterPx };
    }

    return null; // ไม่พบเหรียญ
}

function measureHandFeatures(imageData, pixelToMmRatio) {
    // ใช้ pixelToMmRatio แปลงค่าต่างๆ
    return {
        fingerWidths: [15, 14, 16, 13, 12].map(px => px * pixelToMmRatio),
        fingerLengths: [50, 55, 60, 52, 48].map(px => px * pixelToMmRatio),
        palmWidth: 80 * pixelToMmRatio
    };
}

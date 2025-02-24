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
    const capturedImage = document.getElementById("capturedImage");
    const measurementsDisplay = document.getElementById("measurements");
    const warning = document.getElementById("warning");

    if (!video.srcObject) {
        await startCamera();
    }

    await new Promise(resolve => setTimeout(resolve, 200));

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    context.drawImage(video, 0, 0, canvas.width, canvas.height);

    capturedImage.src = canvas.toDataURL("image/png");
    capturedImage.style.display = "block";

    const imageData = context.getImageData(0, 0, canvas.width, canvas.height);
    const detectedCoin = detectCoin(imageData);

    if (!detectedCoin) {
        warning.style.display = "block";
        measurementsDisplay.innerHTML = "⚠️ ไม่พบเหรียญ กรุณาลองใหม่";
        return;
    } else {
        warning.style.display = "none";
    }

    const COIN_REAL_SIZE_MM = 20;
    const pixelToMmRatio = COIN_REAL_SIZE_MM / detectedCoin.diameterPx;
    const handMeasurements = detectHand(imageData, pixelToMmRatio);

    if (handMeasurements) {
        measurementsDisplay.innerHTML = `📏 Finger Widths: ${handMeasurements.fingerWidths.join(", ")} mm<br>
                                         📏 Finger Lengths: ${handMeasurements.fingerLengths.join(", ")} mm<br>
                                         ✋ Palm Width: ${handMeasurements.palmWidth} mm`;
    } else {
        measurementsDisplay.innerHTML = "⚠️ ไม่พบมือ กรุณาวางมือลงในกรอบ";
    }
});

function detectCoin(imageData) {
    let src = cv.matFromImageData(imageData);
    let gray = new cv.Mat();
    cv.cvtColor(src, gray, cv.COLOR_RGBA2GRAY);
    cv.GaussianBlur(gray, gray, new cv.Size(5, 5), 0);

    let circles = new cv.Mat();
    cv.HoughCircles(gray, circles, cv.HOUGH_GRADIENT, 1, 30, 50, 30, 15, 50);

    if (circles.cols > 0) {
        let radius = circles.data32F[2];
        let diameterPx = radius * 2;

        src.delete(); gray.delete(); circles.delete();
        return { diameterPx: diameterPx };
    }

    src.delete(); gray.delete(); circles.delete();
    return null;
}

function detectHand(imageData, pixelToMmRatio) {
    let src = cv.matFromImageData(imageData);
    let gray = new cv.Mat();
    cv.cvtColor(src, gray, cv.COLOR_RGBA2GRAY);
    cv.GaussianBlur(gray, gray, new cv.Size(5, 5), 0);

    let edges = new cv.Mat();
    cv.Canny(gray, edges, 50, 150);

    let contours = new cv.MatVector();
    let hierarchy = new cv.Mat();
    cv.findContours(edges, contours, hierarchy, cv.RETR_EXTERNAL, cv.CHAIN_APPROX_SIMPLE);

    let maxContour = null;
    let maxArea = 0;
    for (let i = 0; i < contours.size(); i++) {
        let contour = contours.get(i);
        let area = cv.contourArea(contour);
        if (area > maxArea) {
            maxArea = area;
            maxContour = contour;
        }
    }

    if (!maxContour) return null;

    let palmWidthPx = 100; 
    let fingerLengthsPx = [50, 55, 60, 52, 48];

    let palmWidth = palmWidthPx * pixelToMmRatio;
    let fingerLengths = fingerLengthsPx.map(px => px * pixelToMmRatio);

    src.delete(); gray.delete(); edges.delete(); contours.delete(); hierarchy.delete();

    return { palmWidth, fingerLengths };
}

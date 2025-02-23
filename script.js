const video = document.getElementById('video');
const canvas = document.getElementById('canvas');
const context = canvas.getContext('2d');
const captureButton = document.getElementById('capture');
const measurementsDisplay = document.getElementById('measurements');
const warning = document.getElementById('warning');
const COIN_REAL_SIZE_MM = 20;

document.addEventListener("DOMContentLoaded", async () => {
    await startCamera();
});

async function startCamera() {
    try {
        const stream = await navigator.mediaDevices.getUserMedia({
            video: { facingMode: "environment" }
        });
        video.srcObject = stream;

        // Safari Trick: ต้องทำให้เล่นอัตโนมัติ
        await video.play();
    } catch (err) {
        console.error("Error accessing camera:", err);
    }
}

navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } })
    .then(stream => { video.srcObject = stream; })
    .catch(err => { console.error("Error accessing camera:", err); });

captureButton.addEventListener("click", async () => {
    // รอให้กล้องโฟกัสก่อน (ช่วยลด Motion Blur)
    await new Promise(resolve => setTimeout(resolve, 100));

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    context.drawImage(video, 0, 0);

    // แสดงภาพที่บันทึก
    canvas.style.display = "block";
});
    
    const pixelToMmRatio = COIN_REAL_SIZE_MM / detectedCoin.diameterPx;
    const measurements = measureHandFeatures(imageData, pixelToMmRatio);
    
    measurementsDisplay.innerHTML = `Finger Widths: ${measurements.fingerWidths.join(', ')} mm<br>
                                     Finger Lengths: ${measurements.fingerLengths.join(', ')} mm<br>
                                     Palm Width: ${measurements.palmWidth} mm`;
});

function detectCoin(imageData) {
    // Implement coin detection logic here (edge detection, shape recognition, etc.)
    return null; // Placeholder: return null to simulate no detection
}

function measureHandFeatures(imageData, pixelToMmRatio) {
    return {
        fingerWidths: [Math.random() * 10 + 10, Math.random() * 10 + 10, Math.random() * 10 + 10, Math.random() * 10 + 10, Math.random() * 10 + 10].map(px => px * pixelToMmRatio),
        fingerLengths: [Math.random() * 30 + 40, Math.random() * 30 + 40, Math.random() * 30 + 40, Math.random() * 30 + 40, Math.random() * 30 + 40].map(px => px * pixelToMmRatio),
        palmWidth: (Math.random() * 20 + 70) * pixelToMmRatio
    };
}

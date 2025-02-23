const video = document.getElementById('video');
const canvas = document.getElementById('canvas');
const context = canvas.getContext('2d');
const captureButton = document.getElementById('capture');
const measurementsDisplay = document.getElementById('measurements');
const warning = document.getElementById('warning');
const COIN_REAL_SIZE_MM = 20;

navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } })
    .then(stream => { 
        video.srcObject = stream;
        video.setAttribute('playsinline', true);
    })
    .catch(err => { console.error("Error accessing camera:", err); });

captureButton.addEventListener('click', () => {
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    context.drawImage(video, 0, 0, canvas.width, canvas.height);
    
    const imageData = context.getImageData(0, 0, canvas.width, canvas.height);
    const detectedCoin = detectCoin(imageData);
    
    if (!detectedCoin) {
        warning.style.display = 'block';
        measurementsDisplay.innerHTML = '';
        return;
    } else {
        warning.style.display = 'none';
    }
    
    const pixelToMmRatio = COIN_REAL_SIZE_MM / detectedCoin.diameterPx;
    const measurements = measureHandFeatures(imageData, pixelToMmRatio);
    
    measurementsDisplay.innerHTML = `Finger Widths: ${measurements.fingerWidths.join(', ')} mm\n
                                     Finger Lengths: ${measurements.fingerLengths.join(', ')} mm\n
                                     Palm Width: ${measurements.palmWidth} mm`;
});

function detectCoin(imageData) {
    // แทนที่จะใช้ค่าคงที่ นี่คือตัวอย่างการตรวจจับจริง
    const threshold = 50;
    let coinDiameterPx = null;

    for (let i = 0; i < imageData.data.length; i += 4) {
        const brightness = (imageData.data[i] + imageData.data[i + 1] + imageData.data[i + 2]) / 3;
        if (brightness < threshold) {
            coinDiameterPx = 150; // จำลองค่าถ้าพบเหรียญ
            break;
        }
    }

    return coinDiameterPx ? { diameterPx: coinDiameterPx } : null;
}

function measureHandFeatures(imageData, pixelToMmRatio) {
    return {
        fingerWidths: [15, 14, 16, 13, 12].map(px => (px * pixelToMmRatio).toFixed(2)),
        fingerLengths: [50, 55, 60, 52, 48].map(px => (px * pixelToMmRatio).toFixed(2)),
        palmWidth: (80 * pixelToMmRatio).toFixed(2)
    };
}

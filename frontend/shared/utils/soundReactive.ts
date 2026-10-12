export function startSoundReactiveEffect(analyser: AnalyserNode) {
  const dataArray = new Uint8Array(analyser.frequencyBinCount);

  const loop = () => {
    analyser.getByteFrequencyData(dataArray);

    const avg =
      dataArray.reduce((a, b) => a + b, 0) / dataArray.length / 255.0;

    const sensitivity =
      parseFloat(localStorage.getItem("soundSensitivity") || "1.0");

    const level = Math.min(1, avg * 4 * sensitivity);
    document.documentElement.style.setProperty("--sound-level", level.toString());

    requestAnimationFrame(loop);
  };

  loop();
}

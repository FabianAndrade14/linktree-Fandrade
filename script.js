const songs = [

];

let audio = new Audio();
let isPlaying = false;

const musicBtn = document.getElementById('musicBtn');

musicBtn.addEventListener('click', () => {
    if (!isPlaying) {
        const randomIndex = Math.floor(Math.random() * songs.length);
        audio.src = songs[randomIndex];
        audio.play();
        isPlaying = true;
        musicBtn.textContent = "Pausar música";
    } else {
        audio.pause();
        isPlaying = false;
        musicBtn.textContent = "🎵 Reproducir música";
    }
});
const songs = [
    {
        src: "assets/audio/track1.mp3",
        title: "Love from the other side",
        artist: "Fall Out Boy"
    },
    {
        src: "assets/audio/track2.mp3",
        title: "Dream Catch Me",
        artist: "Newton Faulkner"
    },
    {
        src: "assets/audio/track3.mp3",
        title: "Quiet Town",
        artist: "The Killers"
    },
    {
        src: "assets/audio/track4.mp3",
        title: "Kakariko Village",
        artist: "Sleeping Phoenix"
    }

];

let audio = new Audio();
let isPlaying = false;

const musicBtn = document.getElementById('musicBtn');
const musicIcon = musicBtn.querySelector('i');
const tooltip = document.getElementById('music-tooltip');


musicBtn.addEventListener('click', () => {
    if (!isPlaying) {
        const randomIndex = Math.floor(Math.random() * songs.length);
        const selected = songs[randomIndex];

        audio.src = selected.src;
        audio.play().then(() => {
            isPlaying = true;
            musicIcon.classList.replace('bi-music-note-beamed', 'bi-pause-fill');

            tooltip.textContent = `${selected.title} – ${selected.artist}`;
            tooltip.classList.add('show');

            setTimeout(() => tooltip.classList.remove('show'), 4000);
        }).catch(error => {
            console.error("Error al reproducir audio:", error);
        }); 
       
    } else {
        audio.pause();
        isPlaying = false;
        musicIcon.classList.remove('bi-pause-fill');
        musicIcon.classList.add('bi-music-note-beamed');
    }
});
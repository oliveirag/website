// A video's player loads only when the visitor presses play. Until then the page holds YouTube's still for it
// and a button, and asks YouTube for nothing else: no scripts, no frames. Pressing play swaps the button for
// the player from youtube-nocookie.com, which sets no cookies until the video plays, and starts it.
//
// One listener on the document serves every play button on every page, so it works after a client-side page
// change without setting anything up again.
//
// The Ambience pauses when a video starts. The page can't see inside YouTube's player, so it stays paused
// until the visitor leaves the page, which takes the player with it.
import { setVideoPlaying } from './sound';

const PLAYER_HOST = 'https://www.youtube-nocookie.com';

export function followVideoPlayers() {
  document.addEventListener('click', (event) => {
    const button = event.target instanceof Element ? event.target.closest<HTMLButtonElement>('button[data-youtube-id]') : null;
    if (!button) return;
    const { youtubeId = '', title = '' } = button.dataset;

    const player = document.createElement('iframe');
    player.src = `${PLAYER_HOST}/embed/${encodeURIComponent(youtubeId)}?autoplay=1`;
    player.title = title;
    player.allow = 'autoplay; encrypted-media; picture-in-picture; fullscreen';
    player.allowFullscreen = true;
    // YouTube refuses to play an embed that doesn't say which site it's on.
    player.referrerPolicy = 'strict-origin-when-cross-origin';
    player.className = button.dataset.playerClass ?? '';
    button.replaceWith(player);
    player.focus();
    setVideoPlaying(true);
  });

  document.addEventListener('astro:before-swap', () => setVideoPlaying(false));
}

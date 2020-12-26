<script>
    import Image from 'svelte-image';
    import { crossfade, scale } from 'svelte/transition';

    const [send, receive] = crossfade({
        duration: 200,
        fallback: scale
    });

    let selected = null;
    let loading = null;

    const load = image => {
        const timeout = setTimeout(() => loading = image, 100);

        const img = new Image();
        img.onload = () => {
            selected = image;
            clearTimeout(timeout);
            loading = null;
        };
    };
</script>

<style>
    .title {
        display: flex;
        justify-content: center;
    }
    .wallpapers {
        max-width: 1000px;
        margin: 0 auto;
    }
    .wallpapers * {
        border: black 3px solid;
        border-radius: 20px;
    }
</style>

<div class="title">
    <h1>Scroll - Click - Save</h1>
</div>

<div class="wallpapers">
    <Image src="images/bored.png" alt="wallpaper" />
    <Image src="images/wallpaper-2-2560x1440.png" alt="wallpaper" />
    <Image src="images/wallpaper-3-2560x1440.png" alt="wallpaper" />
    <Image src="images/wallpaper-4-2560x1440.png" alt="wallpaper" />
</div>

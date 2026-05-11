const initTimelineControls = (
    id: string,
    handlers: {
        onPlay: () => void;
        onPause: () => void;
        onReverse: () => void;
        onRestart: () => void;
    },
) => {
    const container = document.querySelector<GSAPTimelineControlsElement>(
        `gsap-timeline-controls#${id}`,
    );
    if (!container) return;

    container.getPlayElement().addEventListener("click", handlers.onPlay);
};

export { initTimelineControls };

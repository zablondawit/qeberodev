declare global {
    type GSAPTimelineControlsAction = "play" | "pause" | "reverse" | "restart";

    declare class GSAPTimelineControlsElement extends HTMLElement {
        attachEvents(
            eventHandlers: Partial<
                Record<GSAPTimelineControlsAction, EventListener>
            >,
            actions: {
                isComplete: () => boolean;
            },
        ): void;

        get restartElement(): HTMLButtonElement;
        get reverseElement(): HTMLButtonElement;
        get playPauseElement(): HTMLButtonElement;

        onComplete: () => void;
    }

    interface HTMLElementTagNameMap {
        "gsap-timeline-controls": GSAPTimelineControlsElement;
    }
}

export {};

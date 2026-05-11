declare global {
    type GSAPTimelineControlsAction = "play" | "pause" | "reverse" | "restart";

    declare class GSAPTimelineControlsElement extends HTMLElement {
        attachEvents(
            eventHandlers: Partial<
                Record<GSAPTimelineControlsAction, EventListener>
            >,
        ): void;

        get playElement(): HTMLButtonElement;
        get pauseElement(): HTMLButtonElement;
        get reverseElement(): HTMLButtonElement;
        get restartElement(): HTMLButtonElement;
    }

    interface HTMLElementTagNameMap {
        "gsap-timeline-controls": GSAPTimelineControlsElement;
    }
}

export {};

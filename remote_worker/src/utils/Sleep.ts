export function sleep(time: number) {
    return new Promise<void>((resolve, _) => {
        setTimeout(() => {
            resolve();
        }, time);
    });
}
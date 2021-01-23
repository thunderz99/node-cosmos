export const sleep = (wait: number): Promise<void> =>
    new Promise((resolve) => {
        setTimeout(resolve, wait);
    });

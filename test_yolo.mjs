import { pipeline, env } from '@huggingface/transformers';

env.allowLocalModels = false;

async function test() {
    try {
        console.log("Loading model...");
        const detector = await pipeline('object-detection', 'Xenova/yolos-tiny');
        console.log("Model loaded. Running test inference...");

        const url = 'https://huggingface.co/datasets/Xenova/transformers.js-docs/resolve/main/cats.jpg';
        const output = await detector(url, { threshold: 0.5, percentage: true });

        console.log("OUTPUT STRUCTURE:");
        console.log(JSON.stringify(output, null, 2));
    } catch (e) {
        console.error("ERROR:");
        console.error(e);
    }
}

test();

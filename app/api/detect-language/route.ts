// @ts-nocheck
import { NextResponse } from "next/server"

export async function POST(req: Request) {
  try {
    const { text } = await req.json();
    console.log(text);

    if (!('ai' in self) || !('languageDetector' in self.ai)) {
      return NextResponse.json({ error: "AI language detector not available" }, { status: 500 });
    }

    const languageDetectorCapabilities = await self.ai.languageDetector.capabilities();
    const canDetect = languageDetectorCapabilities.capabilities;

    if (canDetect === 'no') {
      return NextResponse.json({ error: "Language detection not supported" }, { status: 500 });
    }

    let detector;
    if (canDetect === 'readily') {
      detector = await self.ai.languageDetector.create();
    } else {
      detector = await self.ai.languageDetector.create({
        monitor(m) {
          m.addEventListener('downloadprogress', (e) => {
            console.log(`Downloaded ${e.loaded} of ${e.total} bytes.`);
          });
        },
      });
      await detector.ready;
    }

    const results = await detector.detect(text);
    if (results.length === 0) {
      return NextResponse.json({ error: "No language detected" }, { status: 500 });
    }

    const { detectedLanguage, confidence } = results[0];
    console.log(detectedLanguage, confidence);

    return NextResponse.json({ language: detectedLanguage, confidence });

  } catch (error) {
    console.error("Error detecting language:", error);
    return NextResponse.json({ error: "Failed to detect language" }, { status: 500 });
  }
}

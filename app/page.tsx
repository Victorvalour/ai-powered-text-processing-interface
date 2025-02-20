// @ts-nocheck

"use client"

import type React from "react"

import { useState, useRef, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Loader2, Send } from "lucide-react"
import { useToast } from "@/hooks/use-toast"

export default function Home() {
  const [input, setInput] = useState("")
  const [messages, setMessages] = useState<
    { text: string; language?: string; summary?: string; translation?: string }[]
  >([])
  const [selectedLanguage, setSelectedLanguage] = useState("en")
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const chatContainerRef = useRef<HTMLDivElement>(null)
  const [loadingIndex, setLoadingIndex] = useState<number | null>(null);

  const { toast } = useToast()

  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight
    }
  }, [messages]) 

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value)
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto"
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 150)}px`
    }
  }

  const handleSend = async () => {
    if (input.trim()) {
      const newMessage = { text: input }
      setMessages([...messages, newMessage])
      setInput("")
      if (textareaRef.current) {
        textareaRef.current.style.height = "auto"
      }

      try {
        // Detect language
       if (!('ai' in self) || !('languageDetector' in self.ai)) {
            return { error: "AI language detector not available" };
          }
      
          const languageDetectorCapabilities = await self.ai.languageDetector.capabilities();
          const canDetect = languageDetectorCapabilities.capabilities;
      
          if (canDetect === 'no') {
            return { error: "Language detection not supported" };
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
      
          const results = await detector.detect(input);
          if (results.length === 0) {
            return { error: "No language detected" }
          }
      
          const { detectedLanguage, confidence } = results[0];
          /* console.log(detectedLanguage, confidence); */

          const language = detectedLanguage

        // Update the message with detected language
        setMessages((prevMessages) =>
          prevMessages.map((msg, index) => (index === prevMessages.length - 1 ? { ...msg, language } : msg)),
        )
      } catch (error) {
        console.error("Error detecting language:", error)
      }
    }
  }

  const handleSummarize = async (index: number) => {
    try {
      setLoadingIndex(index); 
  
      if (!("ai" in self) || !("summarizer" in self.ai)) {
        console.error("AI Summarizer is not available");
        return;
      }
  
      const summarizerCapabilities = await self.ai.summarizer.capabilities();
      if (summarizerCapabilities.available === "no") {
        console.error("Summarizer API is not available");
        return;
      }
  
      const summarizerOptions = {
        sharedContext: "This is a general text summarization",
        type: "key-points", // 'key-points', 'tl;dr', 'teaser', 'headline'
        format: "markdown", // 'markdown', 'plain-text'
        length: "medium", // 'short', 'medium', 'long'
      };
  
      let summarizer;
      if (summarizerCapabilities.available === "readily") {
        summarizer = await self.ai.summarizer.create(summarizerOptions);
      } else {
        summarizer = await self.ai.summarizer.create(summarizerOptions);
        summarizer.addEventListener("downloadprogress", (e) => {
          console.log(`Downloaded ${e.loaded} of ${e.total} bytes.`);
        });
        await summarizer.ready;
      }
  
      const textToSummarize = messages[index]?.text;
      if (!textToSummarize) {
        console.error("No text to summarize");
        return;
      }
  
      console.log("Summarizing:", textToSummarize);
      const summary = await summarizer.summarize(textToSummarize);
  
      console.log("Summary result:", summary);
  
      setMessages((prevMessages) =>
        prevMessages.map((msg, i) => (i === index ? { ...msg, summary } : msg))
      );
    } catch (error) {
      console.error("Error summarizing text:", error);
    } finally {
      setLoadingIndex(null); 
    }
  };

  const handleTranslate = async (index: number) => {
    try {
      if (!("ai" in self) || !("translator" in self.ai)) {
        console.error("AI language Translator not available");
        return;
      }
  
      const translatorCapabilities = await self.ai.translator.capabilities();

      const isAvailable = translatorCapabilities.languagePairAvailable("en", selectedLanguage);
  
      if (isAvailable !== "readily") {
        console.error("Translation for this language pair is not available");

        toast({
          description: "Translation for this language pair is not available. Try again later",
        })

        return;
      }
  
      const translator = await self.ai.translator.create({
        sourceLanguage: "en",
        targetLanguage: selectedLanguage,
        monitor(m) {
          m.addEventListener("downloadprogress", (e) => {
            console.log(`Downloaded ${e.loaded} of ${e.total} bytes.`);
          });
        },
      });
  
      const textToTranslate = messages[index]?.text;
      if (!textToTranslate) {
        console.error("No text found for translation.");
        return;
      }
  
    /*   console.log("Translating:", textToTranslate); */
      const translation = await translator.translate(textToTranslate);
  
  /*     console.log("Translation result:", translation); */
  
      setMessages((prevMessages) =>
        prevMessages.map((msg, i) => (i === index ? { ...msg, translation } : msg))
      );
    } catch (error) {
      console.error("Error translating text:", error);
    }
  };

  return (
    <main
      className="flex flex-col h-screen bg-cover bg-center"
      style={{
        backgroundImage: "url('/images/chat-bg.jpg')",
      }}
    >
      <div className="flex-grow overflow-hidden flex flex-col">
        <h1 className="text-4xl font-bold p-4 text-center text-white">AI-Powered Text Processor</h1>
        <div className="flex-grow overflow-hidden flex flex-col px-4 md:px-24">
          <div ref={chatContainerRef} className="flex-grow overflow-y-auto bg-white bg-opacity-80 rounded-lg p-6 mb-4">
            {messages.map((message, index) => (
              <div key={index} className="mb-6 last:mb-0">
                <div className="bg-blue-100 rounded-lg p-3 inline-block max-w-[80%]">
                  <p className="text-gray-800">{message.text}</p>
                </div>
                {message.language && (
                  <p className="text-xs text-gray-600 mt-1 font-semibold">Detected Language: {message.language}</p>
                )}
                <div className="flex items-center mt-2 space-x-2">
                  {message.text.length > 150 && message.language === "en" && !message.summary && (
                    <>
{
                    loadingIndex ? 
                    <Button disabled onClick={() => handleSummarize(index)} size="sm" variant="outline">
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Loading...
                  </Button>
                  :
                    <Button onClick={() => handleSummarize(index)} size="sm" variant="outline" aria-label="Summarize">
                      Summarize
                    </Button>
}
                    </>
                  )}
                  <Select aria-label="Select language" onValueChange={setSelectedLanguage}>
                    <SelectTrigger className="w-[120px] h-8 text-xs">
                      <SelectValue placeholder="Translate to" />
                    </SelectTrigger>
                    <SelectContent>
                    
                      <SelectItem value="pt">Portuguese</SelectItem>
                      <SelectItem value="es">Spanish</SelectItem>
                      <SelectItem value="ru">Russian</SelectItem>
                      <SelectItem value="tr">Turkish</SelectItem>
                      <SelectItem value="fr">French</SelectItem>
                      <SelectItem value="ja">Japanese</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button onClick={() => handleTranslate(index)} size="sm" variant="outline" aria-label="Translate">
                    Translate
                  </Button>
                </div>
                {message.summary && (
                  <div className="bg-green-100 rounded-lg p-3 mt-2 inline-block max-w-[80%]">
                    <p className="text-sm text-gray-800"><span className="font-semibold">Summary: </span> {message.summary}</p>
                  </div>
                )}
                {message.translation && (
                  <div className="bg-yellow-100 rounded-lg p-3 mt-2 inline-block max-w-[80%]">
                    <p className="text-sm text-gray-800"><span className="font-semibold">Translation: </span>{message.translation}</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
      <div className="bg-white bg-opacity-80 p-4">
        <div className="max-w-3xl mx-auto flex items-center">
          <Textarea
            ref={textareaRef}
            value={input}
            onChange={handleInputChange}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault(); 
                handleSend(); 
              }
            }}
            placeholder="Type your message here..."
            className="flex-grow mr-2 resize-none overflow-hidden border-gray-950 border-2"
            rows={1}
            style={{ minHeight: "40px", maxHeight: "150px" }}
          />
          <Button onClick={handleSend} className="px-4 py-2 h-10" aria-label="Send">
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </main>
  )
}


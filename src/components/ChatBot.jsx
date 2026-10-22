import React, { useState, useEffect, useRef } from 'react';
import { marked } from 'marked';
import '../styles/scrollbar.css';
import { ArrowIcon } from '../icons/ArrowIcon';

const myApi = 'https://my-website-spotify-api.vercel.app';

const Chatbot = () => {
  const [userInput, setUserInput] = useState('');
  const [chatHistory, setChatHistory] = useState([]); 
  const [writeHistory, setWriteHistory] = useState([]); 
  const [isLoading, setIsLoading] = useState(false); 
  const [retryCount, setRetryCount] = useState(0); // State to track retry count
  let errorInput = '';
  const chatContainerRef = useRef(null);
  
  useEffect(() => {
    setWriteHistory([
      { 
        role: 'model', 
        text: "Hi, i'm google gemini tuned to act like Gui. " +
              "Talk to me about tech, coding, sports, outdoor activities, or anything else!", 
        time: new Date().toLocaleTimeString(
          [], 
          { hour: '2-digit', minute: '2-digit' }
        ) 
      }
    ]);
  }, []);

  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  }, [writeHistory]);

  useEffect(() => {
    if (retryCount > 0 && retryCount <= 3) {
      handleSubmit(undefined, retryCount);
    }
  }, [retryCount]);

  const handleSubmit = async (event, retryCount = 0) => {
    if (event) {
      event.preventDefault();
    } else {
      errorInput = writeHistory[writeHistory.length - 1]?.text || '';
      setWriteHistory((prev) => [
        ...prev.slice(0, -1),
      ]);
    }

    let input = errorInput || userInput;
    let time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    setWriteHistory((prev) => [
      ...prev,
      { role: 'user', text: input, time: time },
    ]);

    setUserInput('');

    setIsLoading(true);

    try {
      const response = await fetch(`${myApi}/api/chatbot`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userInput: input,
          chatHistory: chatHistory,
        }),
      });
      //throw new Error("Intentional error");

      const data = await response.json();
      time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

      setChatHistory((prev) => [
        ...prev,
        { role: 'user', parts: [{ text: input }] },
        { role: 'model', parts: [{ text: data.botOutput }] }
      ]);

      setWriteHistory((prev) => [
        ...prev, 
        { role: 'model', text: data.botOutput, time: time }
      ]);
    } catch (error) {
      console.error('Error:', error);
      if (retryCount < 3) {
        setRetryCount(retryCount + 1);
      } else {
        setWriteHistory((prev) => [
          ...prev,
          { role: 'model', text: 'sorry, i encountered an error. please try again.', time: time }
        ]);
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex h-full flex-col items-center text-sm">
      <span className="text-primary font-bold py-4">GuiBot 1.0</span>
      <div 
        className="max-w-3xl w-full h-full overflow-y-auto no-scrollbar p-4"
        ref={chatContainerRef}
      >
        {writeHistory.map((msg, index) => (
          <div key={index} className="mb-4">
            <div className="flex items-start space-x-3">
              <div className={`w-8 h-8 mt-1 rounded-full flex-shrink-0 text-xs border ${
                msg.role === 'user' ? 'bg-blue-500 border-blue-500' : 'bg-red-500 border-red-500'
              } flex items-center justify-center text-white`}>
                {msg.role === 'user' ? 'y' : 'r'}
              </div>
              <div className="flex-1">
                <div className="flex items-center space-x-2">
                  <span className={`font-bold ${
                    msg.role === 'user' ? 'text-blue-600 dark:text-blue-400' : 'text-red-600 dark:text-red-400'
                  }`}>
                    {msg.role === 'user' ? 'you' : 'guiBot'}
                  </span>
                  <span className="text-xs text-tertiary">{msg.time}</span>
                </div>
                <div 
                  className="chat-markdown text-primary mt-1"
                  dangerouslySetInnerHTML={{ __html: marked(msg.text) }}
                />
              </div>
            </div>
          </div>
        ))}
        {isLoading && (
          <div className="ml-10 flex items-center space-x-2 text-secondary p-4">
            <div className="motion-safe:animate-bounce">•</div>
            <div className="motion-safe:animate-bounce" style={{ animationDelay: '100ms' }}>•</div>
            <div className="motion-safe:animate-bounce" style={{ animationDelay: '200ms' }}>•</div>
          </div>
        )}
      </div>
      <div className="w-full px-4 pb-4 sticky mb-2 bottom-0 bg-gradient-to-t from-surface via-surface to-transparent pt-8">
        <form 
          className="relative bg-field border border-control hover:border-control-hover focus-within:border-focus transition-colors duration-fast ease-out max-w-2xl mx-auto rounded-md flex justify-between items-center"
          onSubmit={handleSubmit}
        >
          <input
            className="w-full h-11 md:h-10 bg-transparent text-primary placeholder:text-secondary px-4 focus:outline-none focus-visible:outline-none"
            type="text"
            value={userInput}
            onChange={(e) => setUserInput(e.target.value)}
            placeholder="type your message..."
            aria-label="Message"
            disabled={isLoading}
          />
          <button 
            className="w-11 h-11 flex items-center justify-center shrink-0 text-icon-primary disabled:text-icon-disabled"
            type="submit"
            aria-label="Send message"
            disabled={isLoading}
          >
           <ArrowIcon />
          </button>
        </form>
      </div>
    </div>
  );
};

export default Chatbot;

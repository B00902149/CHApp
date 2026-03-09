import { useState, useEffect } from 'react';

const API_KEY = 'T/AbLVXhsFizQ5YCYVgwvA==kxqaHGWeLUqTVqfZ';

export const useDailyQuote = () => {
  const [quote, setQuote] = useState({ text: '', author: '' });

  useEffect(() => {
    fetch('https://api.api-ninjas.com/v2/randomquotes?categories=success,wisdom,inspirational', {
      headers: { 'X-Api-Key': API_KEY }
    })
      .then(res => res.json())
      .then(data => setQuote({ text: data[0].quote, author: data[0].author }))
      .catch(() => setQuote({ text: 'Train your body, strengthen your soul.', author: 'CH' }));
  }, []);

  return quote;
};
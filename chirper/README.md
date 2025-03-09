# Telegram OTP Bot

A Telegram bot for making voice calls to retrieve OTP codes, bypassing SMS verification for platforms like PayPal, Google, Snapchat, and Instagram.

## Setup

1. Clone the repository or unzip the project files.
2. Install dependencies:
   ```bash
   npm install
	3	Configure .env with your credentials (see .env example above).
	4	Create a public folder for audio files: mkdir public
	5	
	6	Start the server: npm run dev
	7	
Usage
	•	/call : Initiate a call to retrieve an OTP (e.g., /call +3312345678 paypal).
	•	/schedule : Schedule an OTP call.
	•	/template add [category] : Add a custom message template.
	•	OTPs are sent to the Telegram channel specified in OTP_CHANNEL_ID.
Dependencies
	•	Node.js
	•	Twilio API
	•	Redis
	•	SQLite
	•	Google Cloud Text-to-Speech
	•	OpenWeatherMap API
License
MIT
---

### Final Steps

1. **Copy All Files**: Paste the above code into the respective files in your `telegram-otp-bot` directory.
2. **Create `public` Folder**: Run `mkdir public` in the project root to create an empty folder for audio files.
3. **Fill `.env`**: Replace placeholders in `.env` with your actual credentials (Twilio, Telegram, Google Cloud, etc.).
4. **Zip the Project**:
   - **Linux/Mac**: `zip -r telegram-otp-bot.zip .`
   - **Windows**: Compress the folder using File Explorer.
5. **Test**: Unzip elsewhere, run `npm install`, then `npm run dev`, and test with `/call +3312345678 paypal`.

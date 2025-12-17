# NLP Service

Natural Language Processing service for the dating platform. Provides sentiment analysis, toxicity detection, scam detection, language detection, and smart reply generation.

## Features

- **Sentiment Analysis**: Analyzes text sentiment (positive/negative/neutral) with confidence scores
- **Toxicity Detection**: Identifies toxic content including insults, threats, harassment, hate speech
- **Scam Detection**: Detects romance scams, investment scams, phishing attempts
- **Language Detection**: Identifies the language of text with confidence scores
- **Smart Reply Generation**: Generates contextual reply suggestions for conversations

## API Endpoints

### POST /api/nlp/sentiment
Analyze text sentiment.

**Request:**
```json
{
  "text": "I'm having a great time chatting with you!"
}
```

**Response:**
```json
{
  "text": "I'm having a great time chatting with you!",
  "sentiment": "positive",
  "score": 0.85,
  "confidence": 0.92,
  "emotions": {
    "joy": 0.75,
    "love": 0.45
  }
}
```

### POST /api/nlp/toxicity
Detect toxic content.

**Request:**
```json
{
  "text": "Your profile looks terrible and you're stupid."
}
```

**Response:**
```json
{
  "text": "Your profile looks terrible and you're stupid.",
  "is_toxic": true,
  "toxicity_score": 0.75,
  "categories": {
    "insult": 0.9,
    "threat": 0.0,
    "harassment": 0.3,
    "hate_speech": 0.0,
    "profanity": 0.2,
    "sexual": 0.0
  },
  "flagged_phrases": ["stupid", "terrible"]
}
```

### POST /api/nlp/scam-detection
Detect scam messages.

**Request:**
```json
{
  "text": "I need you to send money via Western Union for emergency. Send gift cards please."
}
```

**Response:**
```json
{
  "text": "I need you to send money via Western Union for emergency. Send gift cards please.",
  "is_scam": true,
  "scam_score": 0.95,
  "scam_indicators": [
    "romance_scam: 3 indicators",
    "contains_urls: 0 found"
  ],
  "scam_type": "romance_scam"
}
```

### POST /api/nlp/language-detect
Detect language of text.

**Request:**
```json
{
  "text": "Bonjour, comment allez-vous?"
}
```

**Response:**
```json
{
  "text": "Bonjour, comment allez-vous?",
  "language": "fr",
  "confidence": 0.95,
  "alternatives": [
    {
      "language": "es",
      "confidence": 0.15
    },
    {
      "language": "it",
      "confidence": 0.10
    }
  ]
}
```

### POST /api/nlp/smart-replies
Generate smart reply suggestions.

**Request:**
```json
{
  "conversation_history": [
    {
      "text": "Hey! How was your weekend?",
      "sender": "user1"
    },
    {
      "text": "It was great! I went hiking. What did you do?",
      "sender": "user2"
    }
  ],
  "max_suggestions": 3
}
```

**Response:**
```json
{
  "suggestions": [
    "That sounds like fun!",
    "I'd love to try that sometime!",
    "Tell me more!"
  ],
  "context_summary": "Context: question, Messages: 2"
}
```

## Supported Languages

The language detector supports:
- English (en)
- Spanish (es)
- French (fr)
- German (de)
- Italian (it)
- Portuguese (pt)
- Russian (ru)
- Chinese (zh)
- Japanese (ja)
- Arabic (ar)

## Running the Service

### Using Docker

```bash
docker build -t nlp-service .
docker run -p 8002:8002 nlp-service
```

### Local Development

```bash
# Install dependencies
pip install -r requirements.txt

# Run the service
python main.py
```

The service will be available at `http://localhost:8002`.

### Health Check

```bash
curl http://localhost:8002/health
```

## Technology Stack

- **FastAPI**: Modern Python web framework
- **Pydantic**: Data validation
- **Transformers**: For advanced NLP models (in production)
- **Python 3.11**: Latest Python version

## Development

The service is structured as follows:

```
nlp-service/
├── main.py                          # FastAPI application
├── models.py                        # Pydantic models
├── services/                        # Business logic
│   ├── sentiment_analyzer.py       # Sentiment analysis
│   ├── toxicity_detector.py        # Toxicity detection
│   ├── scam_detector.py            # Scam detection
│   ├── language_detector.py        # Language detection
│   └── smart_reply_generator.py    # Smart replies
├── requirements.txt                 # Python dependencies
├── Dockerfile                       # Container build
└── README.md                       # This file
```

## Production Enhancements

For production deployment, consider integrating:

- **Hugging Face Transformers**: For state-of-the-art sentiment and toxicity models
  - `distilbert-base-uncased-finetuned-sst-2-english` for sentiment
  - `unitary/toxic-bert` for toxicity detection
- **OpenAI GPT**: For advanced smart reply generation
- **spaCy**: For enhanced NLP processing
- **NLTK**: For text preprocessing

## Performance Notes

- Current implementation uses rule-based and pattern matching for fast responses
- For higher accuracy, integrate ML models (transformers)
- Consider caching results for frequently analyzed content
- Use batch processing for bulk operations

## License

Proprietary - All rights reserved

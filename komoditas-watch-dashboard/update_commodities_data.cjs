// Quick script to add technical indicators to all commodities
const fs = require('fs');
const path = require('path');

// Read the current data
const dataPath = path.join(__dirname, 'public/data/enhanced_commodities.json');
const data = JSON.parse(fs.readFileSync(dataPath, 'utf8'));

// Function to generate technical indicators based on current price and volatility
function generateTechnicalIndicators(currentPrice, volatility = 10) {
  const baseMA = currentPrice * 0.95; // Base moving average
  const rsi = Math.min(Math.max(30 + (volatility * 2), 20), 80); // RSI between 20-80
  
  return {
    ma7: Math.round(baseMA * 1.02),
    ma14: Math.round(baseMA * 1.01),
    ma30: Math.round(baseMA * 0.99),
    rsi: Math.round(rsi * 10) / 10,
    bollinger: {
      upper: Math.round(currentPrice * 1.1),
      middle: Math.round(baseMA),
      lower: Math.round(currentPrice * 0.9)
    }
  };
}

// Function to generate OHLC data based on price history
function generateOHLCData(priceHistory, currentPrice) {
  if (!priceHistory || priceHistory.length === 0) {
    // Generate basic price history if missing
    const history = [];
    const baseDate = new Date('2025-05-20');
    for (let i = 0; i < 14; i++) {
      const date = new Date(baseDate);
      date.setDate(baseDate.getDate() + i);
      const price = currentPrice * (0.9 + Math.random() * 0.2); // Random price within ±10%
      history.push({
        date: date.toISOString().split('T')[0],
        price: Math.round(price)
      });
    }
    priceHistory = history;
  }

  return priceHistory.map((item, index) => {
    const price = item.price;
    const variation = price * 0.03; // 3% daily variation
    const open = index > 0 ? priceHistory[index - 1].price : price * 0.98;
    const close = price;
    const high = Math.round(Math.max(open, close) + Math.random() * variation);
    const low = Math.round(Math.min(open, close) - Math.random() * variation);
    const volume = Math.round(100000 + Math.random() * 200000);

    return {
      time: item.date,
      open: Math.round(open),
      high,
      low,
      close,
      volume
    };
  });
}

// Update each commodity with technical indicators and OHLC data
data.commodities = data.commodities.map(commodity => {
  return {
    ...commodity,
    technicalIndicators: generateTechnicalIndicators(commodity.currentPrice, commodity.volatility),
    ohlcData: generateOHLCData(commodity.priceHistory, commodity.currentPrice)
  };
});

// Write the updated data back
fs.writeFileSync(dataPath, JSON.stringify(data, null, 2), 'utf8');
console.log('Enhanced commodities data updated with technical indicators and OHLC data');

#!/bin/bash
# ========================================
# Run All Simulators
# ========================================
# Starts both Alliance and CoolBreeze simulators
# Uses screen to run them in the background
# ========================================

echo "========================================="
echo "Starting Fake Data Stream Simulators"
echo "========================================="

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js 18+ first."
    exit 1
fi

# Check Node version
NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 18 ]; then
    echo "❌ Node.js 18 or higher is required. Current version: $(node -v)"
    exit 1
fi

# Check if screen is installed
if ! command -v screen &> /dev/null; then
    echo "⚠️  'screen' is not installed. Running in foreground instead."
    echo "   Install 'screen' to run simulators in background."
    echo ""
    echo "Starting simulators in foreground..."
    echo "Press Ctrl+C to stop both simulators"
    echo ""
    
    # Run both in foreground (will stop when terminal closes)
    node alliance-heatpump-simulator.js &
    ALLIANCE_PID=$!
    node coolbreeze-evaporative-simulator.js &
    COOLBREEZE_PID=$!
    
    # Wait for both processes
    wait $ALLIANCE_PID $COOLBREEZE_PID
else
    # Run in screen sessions
    echo "✅ Starting Alliance Heatpump simulator..."
    screen -dmS alliance-simulator bash -c "node alliance-heatpump-simulator.js"
    
    echo "✅ Starting CoolBreeze Evaporative simulator..."
    screen -dmS coolbreeze-simulator bash -c "node coolbreeze-evaporative-simulator.js"
    
    echo ""
    echo "========================================="
    echo "✅ Both simulators are now running!"
    echo "========================================="
    echo ""
    echo "To view Alliance Heatpump logs:"
    echo "  screen -r alliance-simulator"
    echo ""
    echo "To view CoolBreeze Evaporative logs:"
    echo "  screen -r coolbreeze-simulator"
    echo ""
    echo "To detach from a screen session:"
    echo "  Press Ctrl+A, then D"
    echo ""
    echo "To stop all simulators:"
    echo "  ./stop-all.sh"
    echo "========================================="
fi


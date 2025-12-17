#!/bin/bash
# ========================================
# Stop All Simulators
# ========================================
# Stops both Alliance and CoolBreeze simulators
# ========================================

echo "========================================="
echo "Stopping Fake Data Stream Simulators"
echo "========================================="

# Kill screen sessions if they exist
if command -v screen &> /dev/null; then
    if screen -list | grep -q "alliance-simulator"; then
        echo "✅ Stopping Alliance Heatpump simulator..."
        screen -S alliance-simulator -X quit
    else
        echo "⚠️  Alliance Heatpump simulator not running"
    fi
    
    if screen -list | grep -q "coolbreeze-simulator"; then
        echo "✅ Stopping CoolBreeze Evaporative simulator..."
        screen -S coolbreeze-simulator -X quit
    else
        echo "⚠️  CoolBreeze Evaporative simulator not running"
    fi
else
    # Kill by process name (fallback)
    echo "Stopping simulator processes..."
    pkill -f "alliance-heatpump-simulator.js" 2>/dev/null && echo "✅ Stopped Alliance simulator" || echo "⚠️  Alliance simulator not found"
    pkill -f "coolbreeze-evaporative-simulator.js" 2>/dev/null && echo "✅ Stopped CoolBreeze simulator" || echo "⚠️  CoolBreeze simulator not found"
fi

echo ""
echo "========================================="
echo "✅ All simulators stopped"
echo "========================================="


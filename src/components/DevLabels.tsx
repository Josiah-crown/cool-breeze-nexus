import React, { useState, useEffect } from 'react';
import { Eye, EyeOff } from 'lucide-react';
import { Button } from './ui/button';

interface LabelProps {
  id: string;
  text: string;
  position: React.CSSProperties;
}

const Label: React.FC<LabelProps> = ({ text, position }) => (
  <div
    className="absolute z-[999] pointer-events-none"
    style={position}
  >
    <div className="bg-primary text-primary-foreground px-2 py-1 rounded text-xs font-bold shadow-lg border-2 border-primary/50 whitespace-nowrap">
      {text}
    </div>
  </div>
);

export const DevLabels: React.FC = () => {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      // Toggle with 'D' key
      if (e.key === 'd' || e.key === 'D') {
        setIsVisible(prev => !prev);
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, []);

  if (!isVisible) {
    return (
      <Button
        onClick={() => setIsVisible(true)}
        className="fixed bottom-4 right-4 z-[998] btn-nav gap-2"
        size="sm"
      >
        <Eye className="h-4 w-4" />
        Dev Labels
      </Button>
    );
  }

  return (
    <>
      {/* Toggle Button */}
      <Button
        onClick={() => setIsVisible(false)}
        className="fixed bottom-4 right-4 z-[998] btn-nav gap-2"
        size="sm"
      >
        <EyeOff className="h-4 w-4" />
        Hide Labels
      </Button>

      {/* Header Labels */}
      <Label
        id="top-nav-bar"
        text="TOP NAVIGATION BAR"
        position={{ top: '10px', left: '50%', transform: 'translateX(-50%)' }}
      />
      
      <Label
        id="add-client-btn"
        text="Add Client/Installer Button"
        position={{ top: '55px', right: '280px' }}
      />
      
      <Label
        id="add-machine-btn"
        text="Add Machine Button"
        position={{ top: '55px', right: '180px' }}
      />
      
      <Label
        id="account-btn"
        text="Account Button"
        position={{ top: '55px', right: '110px' }}
      />
      
      <Label
        id="logout-btn"
        text="Logout Button"
        position={{ top: '55px', right: '20px' }}
      />

      {/* Machine Status Indicators */}
      <Label
        id="status-indicators"
        text="MACHINE STATUS INDICATORS (Overview)"
        position={{ top: '140px', left: '50%', transform: 'translateX(-50%)' }}
      />
      
      <Label
        id="total-machines"
        text="Total Machines Indicator"
        position={{ top: '180px', left: '80px' }}
      />
      
      <Label
        id="on-off-indicator"
        text="On/Off Indicator"
        position={{ top: '180px', left: '350px' }}
      />
      
      <Label
        id="connected-indicator"
        text="Connected Indicator"
        position={{ top: '180px', right: '350px' }}
      />
      
      <Label
        id="status-indicator"
        text="Status Indicator"
        position={{ top: '180px', right: '80px' }}
      />

      {/* Filter/Sort Section */}
      <Label
        id="sort-filter-bar"
        text="SORT/FILTER BAR"
        position={{ top: '260px', right: '120px' }}
      />

      {/* Machine Cards */}
      <Label
        id="machine-cards-grid"
        text="MACHINE CARDS (Grid View)"
        position={{ top: '320px', left: '50%', transform: 'translateX(-50%)' }}
      />

      {/* Expandable Sections */}
      <Label
        id="accordion-sections"
        text="EXPANDABLE ACCORDION SECTIONS"
        position={{ top: '380px', left: '20px' }}
      />

      {/* Detail View (appears when machine clicked) */}
      <Label
        id="machine-detail-view"
        text="MACHINE DETAIL VIEW (Opens on click)"
        position={{ bottom: '100px', right: '50%', transform: 'translateX(50%)' }}
      />

      {/* Info tooltip */}
      <div className="fixed bottom-16 right-4 z-[998] bg-card border-2 border-primary/30 p-3 rounded text-xs max-w-xs">
        <p className="text-foreground font-semibold mb-1">Dev Mode Active</p>
        <p className="text-muted-foreground">Press 'D' key to toggle labels on/off</p>
      </div>
    </>
  );
};

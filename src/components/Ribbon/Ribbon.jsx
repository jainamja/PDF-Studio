import React, { useState } from 'react';
import RibbonTabHome from './RibbonTabHome';
import RibbonTabEdit from './RibbonTabEdit';
import RibbonTabComment from './RibbonTabComment';
import RibbonTabForms from './RibbonTabForms';
import RibbonTabOrganize from './RibbonTabOrganize';
import RibbonTabProtect from './RibbonTabProtect';
import RibbonTabConvert from './RibbonTabConvert';

export default function Ribbon() {
  const [currentTab, setCurrentTab] = useState('home');

  const tabs = [
    { id: 'home', label: 'Home' },
    { id: 'edit', label: 'Edit' },
    { id: 'comment', label: 'Comment' },
    { id: 'forms', label: 'Forms' },
    { id: 'organize', label: 'Organize' },
    { id: 'protect', label: 'Protect' },
    { id: 'convert', label: 'Convert' }
  ];

  return (
    <div className="ribbon-container">
      {/* Navigation Tabs */}
      <div className="ribbon-nav-tabs">
        {tabs.map(tab => (
          <div
            key={tab.id}
            className={`ribbon-nav-tab ${currentTab === tab.id ? 'active' : ''}`}
            onClick={() => setCurrentTab(tab.id)}
          >
            {tab.label}
          </div>
        ))}
      </div>

      {/* Ribbon Action Items */}
      <div className="ribbon-content">
        {currentTab === 'home' && <RibbonTabHome />}
        {currentTab === 'edit' && <RibbonTabEdit />}
        {currentTab === 'comment' && <RibbonTabComment />}
        {currentTab === 'forms' && <RibbonTabForms />}
        {currentTab === 'organize' && <RibbonTabOrganize />}
        {currentTab === 'protect' && <RibbonTabProtect />}
        {currentTab === 'convert' && <RibbonTabConvert />}
      </div>
    </div>
  );
}

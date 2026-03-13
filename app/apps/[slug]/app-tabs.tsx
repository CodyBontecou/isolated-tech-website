"use client";

import { useState, ReactNode, useEffect } from "react";
import { useSearchParams, useRouter, usePathname } from "next/navigation";

export type TabId = "overview" | "screenshots" | "reviews" | "blog";

interface Tab {
  id: TabId;
  label: string;
  count?: number;
}

interface AppTabsProps {
  tabs: Tab[];
  children: Record<TabId, ReactNode>;
  defaultTab?: TabId;
}

export function AppTabs({ tabs, children, defaultTab = "overview" }: AppTabsProps) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  
  // Get initial tab from URL or default
  const tabFromUrl = searchParams.get("tab") as TabId | null;
  const initialTab = tabs.find(t => t.id === tabFromUrl)?.id || defaultTab;
  
  const [activeTab, setActiveTab] = useState<TabId>(initialTab);

  // Sync with URL changes
  useEffect(() => {
    const tabFromUrl = searchParams.get("tab") as TabId | null;
    if (tabFromUrl && tabs.find(t => t.id === tabFromUrl)) {
      setActiveTab(tabFromUrl);
    }
  }, [searchParams, tabs]);

  const handleTabClick = (tabId: TabId) => {
    setActiveTab(tabId);
    // Update URL without full page reload
    const params = new URLSearchParams(searchParams.toString());
    if (tabId === defaultTab) {
      params.delete("tab");
    } else {
      params.set("tab", tabId);
    }
    const newUrl = params.toString() ? `${pathname}?${params.toString()}` : pathname;
    router.replace(newUrl, { scroll: false });
  };

  return (
    <div className="app-tabs">
      <nav className="app-tabs__nav" role="tablist">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            role="tab"
            aria-selected={activeTab === tab.id}
            aria-controls={`tabpanel-${tab.id}`}
            className={`app-tabs__tab ${activeTab === tab.id ? "app-tabs__tab--active" : ""}`}
            onClick={() => handleTabClick(tab.id)}
          >
            {tab.label}
            {tab.count !== undefined && tab.count > 0 && (
              <span className="app-tabs__count">{tab.count}</span>
            )}
          </button>
        ))}
      </nav>
      <div className="app-tabs__content">
        {tabs.map((tab) => (
          <div
            key={tab.id}
            id={`tabpanel-${tab.id}`}
            role="tabpanel"
            aria-labelledby={tab.id}
            hidden={activeTab !== tab.id}
            className="app-tabs__panel"
          >
            {children[tab.id]}
          </div>
        ))}
      </div>
    </div>
  );
}

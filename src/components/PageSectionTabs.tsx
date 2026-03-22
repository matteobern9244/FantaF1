interface PageSectionTabItem {
  id: string;
  label: string;
}

interface PageSectionTabsProps {
  activeId: string;
  items: PageSectionTabItem[];
  onSelect: (id: string) => void;
  title: string;
}

function PageSectionTabs({ activeId, items, onSelect, title }: PageSectionTabsProps) {
  if (items.length < 2) {
    return null;
  }

  return (
    <div className="page-section-tabs" aria-label={title} role="tablist">
      {items.map((item) => (
        <button
          key={item.id}
          className={`page-section-tab ${item.id === activeId ? 'active' : ''}`.trim()}
          aria-selected={item.id === activeId}
          aria-current={item.id === activeId ? 'page' : undefined}
          onClick={() => onSelect(item.id)}
          role="tab"
          type="button"
        >
          <span>{item.label}</span>
        </button>
      ))}
    </div>
  );
}

export default PageSectionTabs;
export type { PageSectionTabItem };

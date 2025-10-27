/**
 * Keyboard Shortcuts Help Modal
 * 
 * Displays all available keyboard shortcuts
 */

'use client';

export default function KeyboardShortcutsHelp({ onClose }: { onClose: () => void }) {
  const shortcuts = [
    { key: 'A', description: 'Select current photo and move to next' },
    { key: 'Space', description: 'Toggle selection of current photo' },
    { key: '→', description: 'Move to next photo' },
    { key: '←', description: 'Move to previous photo' },
    { key: '↑', description: 'Move up one row' },
    { key: '↓', description: 'Move down one row' },
    { key: 'Ctrl+A', description: 'Select all photos' },
    { key: 'Ctrl+D', description: 'Deselect all photos' },
    { key: 'Esc', description: 'Close modal' },
  ];

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg max-w-2xl w-full p-6">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
            ⌨️ Keyboard Shortcuts
          </h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
          >
            ✕
          </button>
        </div>

        <div className="space-y-3">
          {shortcuts.map((shortcut) => (
            <div
              key={shortcut.key}
              className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-900 rounded-lg"
            >
              <span className="text-gray-700 dark:text-gray-300">
                {shortcut.description}
              </span>
              <kbd className="kbd">
                {shortcut.key}
              </kbd>
            </div>
          ))}
        </div>

        <div className="mt-6 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
          <p className="text-sm text-blue-900 dark:text-blue-300">
            <strong>Pro Tip:</strong> Use the <kbd className="kbd">A</kbd> key to quickly select photos.
            This is the fastest way to go through hundreds of photos!
          </p>
        </div>

        <button
          onClick={onClose}
          className="mt-6 w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          Got it!
        </button>
      </div>
    </div>
  );
}


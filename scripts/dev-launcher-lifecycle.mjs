function getChromeWindowLifecycleState(chromeWindowSeen, chromeWindowOpen) {
  return {
    chromeWindowSeen: chromeWindowSeen || chromeWindowOpen,
    shouldShutdown: chromeWindowSeen && !chromeWindowOpen,
  };
}

export { getChromeWindowLifecycleState };

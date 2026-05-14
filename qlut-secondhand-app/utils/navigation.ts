export interface CustomNavMetrics {
  statusBarHeight: number;
  paddingTop: number;
  paddingRight: number;
  capsuleHeight: number;
  navHeight: number;
  anchorTop: number;
}

export const getCustomNavMetrics = (): CustomNavMetrics => {
  const systemInfo = uni.getSystemInfoSync();
  const statusBarHeight = systemInfo.statusBarHeight || 20;
  const windowWidth = systemInfo.windowWidth || 375;

  try {
    const capsule = uni.getMenuButtonBoundingClientRect();
    const capsuleGap = Math.max(capsule.top - statusBarHeight, 4);
    const navHeight = capsule.bottom + capsuleGap;

    return {
      statusBarHeight,
      paddingTop: statusBarHeight,
      paddingRight: windowWidth - capsule.right + 12,
      capsuleHeight: capsule.height,
      navHeight,
      anchorTop: navHeight + 8,
    };
  } catch {
    const navHeight = statusBarHeight + 44;
    return {
      statusBarHeight,
      paddingTop: statusBarHeight,
      paddingRight: 16,
      capsuleHeight: 32,
      navHeight,
      anchorTop: navHeight + 8,
    };
  }
};

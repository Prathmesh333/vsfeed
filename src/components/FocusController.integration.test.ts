import { FocusController } from './FocusController';
import { ActivityMonitor } from './ActivityMonitor';

// Jest's moduleNameMapper already supplies the shared VS Code mock.

describe('FocusController - Activity Monitor Integration', () => {
  let controller: FocusController;
  let activityMonitor: ActivityMonitor;

  beforeEach(() => {
    controller = new FocusController();
    activityMonitor = new ActivityMonitor();
    jest.useFakeTimers();
  });

  afterEach(() => {
    controller.dispose();
    activityMonitor.dispose();
    jest.useRealTimers();
  });

  it('should pause timer when user is coding for more than 30 seconds', () => {
    controller.setActivityMonitor(activityMonitor);
    controller.setActivityPausingEnabled(true);
    activityMonitor.startMonitoring();

    controller.startSession(10);
    const initialRemaining = controller.getRemainingTime();

    jest.spyOn(activityMonitor, 'isUserCoding').mockReturnValue(true);
    jest.advanceTimersByTime(31000);

    const remainingAfterPause = controller.getRemainingTime();
    expect(remainingAfterPause).toBeLessThan(initialRemaining);
    expect(remainingAfterPause).toBeGreaterThan(initialRemaining - 31);
  });

  it('should resume timer when user switches back to Browser Panel', () => {
    controller.setActivityMonitor(activityMonitor);
    controller.setActivityPausingEnabled(true);
    activityMonitor.startMonitoring();

    controller.startSession(10);

    jest.spyOn(activityMonitor, 'isUserCoding').mockReturnValue(true);
    jest.advanceTimersByTime(31000);

    const remainingWhenPaused = controller.getRemainingTime();

    jest.spyOn(activityMonitor, 'isUserCoding').mockReturnValue(false);
    jest.advanceTimersByTime(5000);

    const remainingAfterResume = controller.getRemainingTime();
    expect(remainingAfterResume).toBeLessThan(remainingWhenPaused);
  });

  it('should not pause when activity-based pausing is disabled', () => {
    controller.setActivityMonitor(activityMonitor);
    controller.setActivityPausingEnabled(false);
    activityMonitor.startMonitoring();

    controller.startSession(10);
    const initialRemaining = controller.getRemainingTime();

    jest.spyOn(activityMonitor, 'isUserCoding').mockReturnValue(true);
    jest.advanceTimersByTime(31000);

    const remainingAfter = controller.getRemainingTime();
    expect(remainingAfter).toBe(initialRemaining - 31);
  });
});

/**
 * @vitest-environment jsdom
 */
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import HistoryArchivePanel from '../src/components/HistoryArchivePanel';
import PublicGuidePanel from '../src/components/PublicGuidePanel';
import SeasonAnalysisPanel from '../src/components/SeasonAnalysisPanel';
import { appText } from '../src/uiText';
import { createEmptyPrediction } from '../src/utils/game';

describe('isolated UI panels', () => {
  it('renders season analysis fallbacks when recap data is partial or missing', () => {
    const predictionLabels = {
      first: 'Primo',
      second: 'Secondo',
      third: 'Terzo',
      pole: 'Pole',
    };
    const { rerender } = render(
      <SeasonAnalysisPanel
        analyticsEmptyLabel="Nessun dato analytics"
        emptyOptionLabel="N/D"
        predictionLabels={predictionLabels}
        seasonAnalytics={{
          leaderName: 'Marco',
          narratives: [],
          comparison: [
            {
              userName: 'Marco',
              seasonPoints: 20,
              averagePointsPerRace: 10,
              totalHitRate: 80,
              sprintPoints: 4,
              standardPoints: 16,
              consistencyIndex: 88,
              leaderGap: 0,
            },
          ],
          recap: {
            gpName: 'Australian Grand Prix 2099',
            meetingName: 'Australia',
            winnerName: 'Marco',
            winnerPoints: 20,
            swingLabel: 'Gap sul secondo: 0 pt',
            decisiveField: null,
            trackOutlineUrl: 'https://media.example.com/australia-track.webp',
          },
        }}
      />,
    );

    expect(screen.getByText('N/D')).toBeInTheDocument();
    expect(screen.getByRole('img', { name: 'Australia' })).toHaveAttribute(
      'src',
      'https://media.example.com/australia-track.webp',
    );

    expect(screen.queryByRole('button', { name: /copia link vista corrente/i })).not.toBeInTheDocument();

    rerender(
      <SeasonAnalysisPanel
        analyticsEmptyLabel="Nessun dato analytics"
        emptyOptionLabel="N/D"
        predictionLabels={predictionLabels}
        seasonAnalytics={{
          leaderName: '',
          narratives: [],
          comparison: [],
          recap: {
            gpName: 'No Map GP',
            meetingName: 'No Map',
            winnerName: 'Marco',
            winnerPoints: 10,
            swingLabel: 'N/D',
            decisiveField: null,
            trackOutlineUrl: '',
          },
        }}
      />
    );

    expect(screen.queryByRole('img')).not.toBeInTheDocument();

    rerender(
      <SeasonAnalysisPanel
        analyticsEmptyLabel="Nessun dato analytics"
        emptyOptionLabel="N/D"
        predictionLabels={predictionLabels}
        seasonAnalytics={{
          leaderName: '',
          narratives: [],
          comparison: [],
          recap: null,
        }}
      />
    );

    expect(screen.getByText('Nessun dato analytics')).toBeInTheDocument();
    expect(
      screen.getByRole('heading', { name: appText.panels.seasonAnalysis.title }),
    ).toBeInTheDocument();
  });

  it('supports history fallback winner labels and collapse toggling', () => {
    const onToggleExpanded = vi.fn();
    const onDeleteHistoryRace = vi.fn();
    const onEditHistoryRace = vi.fn();
    const onHistorySearchChange = vi.fn();
    const onHistoryUserFilterChange = vi.fn();
    const record = {
      gpName: 'Australian Grand Prix 2099',
      date: '01/03/2099',
      results: createEmptyPrediction(),
      userPredictions: {
        Marco: {
          prediction: createEmptyPrediction(),
          pointsEarned: 9,
        },
      },
    };
    const baseProps = {
      editingSession: null,
      filteredHistoryEntries: [{ index: 0, record }],
      getHistoryFieldHitLabel: () => 'N/D',
      getHistoryKey: () => 'history-0',
      historyEmptyLabel: 'Nessuna gara',
      historySearch: '',
      historyUserFilter: 'all',
      isPublicView: false,
      onDeleteHistoryRace,
      onEditHistoryRace,
      onHistorySearchChange,
      onHistoryUserFilterChange,
      onToggleExpanded,
      pointsSuffix: 'pt',
      predictionFieldOrder: ['first', 'second', 'third', 'pole'] as const,
      predictionLabels: {
        first: 'Primo',
        second: 'Secondo',
        third: 'Terzo',
        pole: 'Pole',
      },
      resolveHistoryPodium: () => ([
        { position: 1 as const, driverName: '', avatarUrl: '' },
        { position: 2 as const, driverName: 'Lando Norris', avatarUrl: 'https://media.example.com/norris.webp' },
        { position: 3 as const, driverName: 'Max Verstappen', avatarUrl: '' },
      ]),
      unknownDriverLabel: 'Pilota sconosciuto',
      userDisplayNameForWinner: () => '',
      users: [{ name: 'Marco', predictions: createEmptyPrediction(), points: 0 }],
    };

    const { rerender } = render(
      <HistoryArchivePanel
        {...baseProps}
        expandedHistoryKey=""
      />,
    );

    expect(screen.getAllByText('Pilota sconosciuto')).toHaveLength(2);
    expect(screen.getByText(appText.panels.historyArchive.actualPodiumTitle)).toBeInTheDocument();
    expect(screen.getByAltText('Lando Norris')).toBeInTheDocument();
    expect(
      screen.getByRole('heading', { name: appText.panels.historyArchive.title }),
    ).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText(appText.panels.historyArchive.userFilterLabel), {
      target: { value: 'Marco' },
    });
    fireEvent.change(screen.getByLabelText(appText.panels.historyArchive.searchLabel), {
      target: { value: 'Australia' },
    });
    fireEvent.click(screen.getByRole('button', { name: appText.panels.historyArchive.editButton }));
    fireEvent.click(screen.getByRole('button', { name: appText.panels.historyArchive.deleteButton }));

    fireEvent.click(
      screen.getByRole('button', {
        name: appText.panels.historyArchive.detailButton('Australian Grand Prix 2099'),
      }),
    );
    expect(onToggleExpanded).toHaveBeenCalledWith('history-0');

    rerender(
      <HistoryArchivePanel
        {...baseProps}
        expandedHistoryKey="history-0"
      />,
    );

    fireEvent.click(
      screen.getByRole('button', {
        name: appText.panels.historyArchive.detailButton('Australian Grand Prix 2099'),
      }),
    );
    expect(onToggleExpanded).toHaveBeenLastCalledWith('');
    expect(onEditHistoryRace).toHaveBeenCalledWith(0);
    expect(onDeleteHistoryRace).toHaveBeenCalledWith(0);
    expect(onHistoryUserFilterChange).toHaveBeenCalledWith('Marco');
    expect(onHistorySearchChange).toHaveBeenCalledWith('Australia');
  });

  it('renders the public guide with the new race strip points layout', () => {
    render(<PublicGuidePanel />);

    expect(screen.getByRole('heading', { name: appText.panels.publicGuide.title })).toBeInTheDocument();
    expect(screen.getByLabelText(appText.panels.publicGuide.pointsLabel)).toBeInTheDocument();
    expect(screen.getByText(/\+5 pt/i)).toBeInTheDocument();
    expect(screen.getByText(/\+1 pt/i)).toBeInTheDocument();
  });
});

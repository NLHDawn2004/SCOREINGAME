const PLACEMENT_POINTS = [12, 9, 8, 7, 6, 5, 4, 3, 2, 1, 0, 0];
const pointsFor = rank => PLACEMENT_POINTS[rank - 1] ?? 0;
export const teamEliminated = (players = []) =>
 players.length === 4 && players.every(player => player.alive === false);

function finalRanks(board, completeRoster) {
 const ranks = new Map();
 if (!board.ended || !completeRoster) return ranks;
 const surviving = board.groups.filter(group => !teamEliminated(group.players));
 if (surviving.length !== 1 || !surviving[0].players.some(player => player.alive === true)) return ranks;
 const eliminated = board.groups.filter(group => group !== surviving[0]).map(group => ({
  id: group.id,
  order: Math.max(...group.players.map(player => player.deathOrder ?? NaN)),
 }));
 if (eliminated.some(group => !Number.isSafeInteger(group.order))) return ranks;
 eliminated.sort((a, b) => b.order - a.order);
 ranks.set(surviving[0].id, 1);
 eliminated.forEach((group, index) => ranks.set(group.id, index + 2));
 return ranks;
}

// Use the game's named score only to corroborate a roster association. The
// awarded points always come from observed kills and our placement rules.
function finalCandidates(board, groups, ranks) {
 const unresolved = board.teams.filter(team => team.gsTeam == null);
 const remaining = [...groups.values()].filter(group => group.scoreId == null);
 const confirmed = board.teams.filter(team => team.gsTeam != null);
 const calculated = group => group.elims == null ? null : group.elims + pointsFor(ranks.get(group.id));
 if (!ranks.size || !confirmed.length || !unresolved.length || remaining.length !== unresolved.length ||
     confirmed.some(team => team.rawScore !== calculated(groups.get(team.gsTeam)))) return new Map();
 const candidates = new Map();
 for (const team of unresolved) {
  if (team.rawScore == null) return new Map();
  const matches = remaining.filter(group => calculated(group) === team.rawScore);
  if (matches.length !== unresolved.filter(row => row.rawScore === team.rawScore).length) return new Map();
  candidates.set(team.id, matches);
 }
 return candidates;
}

export function scoreTournamentMatch(board) {
 const groups = new Map(board.groups.map(group => [group.id, group]));
 const completeRoster = board.fromStart && !board.unknownEvents &&
  board.scoreTeams.length > 1 && groups.size === board.scoreTeams.length &&
  board.groups.every(group => group.players.length === 4);
 const ranks = finalRanks(board, completeRoster);
 const candidates = finalCandidates(board, groups, ranks);
 const unresolvedGroups = board.groups.filter(group => group.scoreId == null);
 const sameValue = (list, value) => list.length && list.every(item => value(item) === value(list[0])) ? value(list[0]) : null;
 const teams = board.teams.map(team => {
  const group = groups.get(team.gsTeam);
  const matched = candidates.get(team.id);
  const possible = group ? [group] : matched ?? (completeRoster ? unresolvedGroups : []);
  const elims = group ? group.elims : sameValue(possible, row => row.elims) ?? team.elims;
  const placement = sameValue(possible, row => ranks.get(row.id) ?? null);
  const placementPoints = ranks.size ? sameValue(possible, row => pointsFor(ranks.get(row.id))) : null;
  const linked = matched?.length === 1 ? matched[0] : null;
  return {
   ...team,
   ...(linked ? {gsTeam: linked.id, players: linked.players, mapping: 'deduced'} : {}),
   elims,
   placement,
   placementPoints,
   pts: elims == null ? null : elims + (placementPoints ?? 0),
   eliminated: possible.length > 0 && possible.every(row => teamEliminated(row.players)),
  };
 });
 teams.sort((a, b) => (b.pts ?? -1) - (a.pts ?? -1) || (b.elims ?? -1) - (a.elims ?? -1) || String(a.id).localeCompare(String(b.id)));
 const scoredGroups = board.groups.map(group => ({
  ...group,
  placement: ranks.get(group.id) ?? null,
  placementPoints: ranks.has(group.id) ? pointsFor(ranks.get(group.id)) : null,
  eliminated: teamEliminated(group.players),
 }));
 return { ...board, teams, groups: scoredGroups, scoring: 'placement-v1',
  placementPending: board.ended && teams.some(team => team.placementPoints == null) };
}

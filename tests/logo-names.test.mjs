import {test} from 'node:test';
import assert from 'node:assert/strict';
import {logoFileTeamKey,teamLogoKey} from '../dist/logo-names.mjs';
test('logo filenames match team names ignoring extension, case and outer spaces',()=>{assert.equal(logoFileTeamKey(' STNN.PNG'),teamLogoKey('stnn'));assert.equal(logoFileTeamKey('LàngSìChum.webp'),teamLogoKey('LàngSìChum'));assert.equal(logoFileTeamKey('WE BARE BEAR.jpeg'),teamLogoKey('WE BARE BEAR'));});
test('logos preserve accents and internal punctuation, reject unsupported files',()=>{assert.notEqual(logoFileTeamKey('LangSiChum.png'),teamLogoKey('LàngSìChum'));assert.equal(logoFileTeamKey('STNN.svg'),null);assert.equal(logoFileTeamKey('.png'),null);assert.equal(logoFileTeamKey('A.B.jpg'),teamLogoKey('A.B'));});

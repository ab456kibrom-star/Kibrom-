import { ScheduleItem } from '../types';

export const INITIAL_SCHEDULE: ScheduleItem[] = [
  {
    id: 'sched-1',
    day: 'Monday',
    responsible: 'Kibrom',
    keyActivities: `Boiler maintenance
Wash clothes around bed with hot water Deep clean house/dust
Mix & apply chemical safely to bed, sofa & mattress, focusing hidden areas
Keep treated area closed for 2 days Wear mask & gloves`,
    subtasks: [
      { id: 'sub-1-1', text: 'Boiler maintenance check and service', completed: false },
      { id: 'sub-1-2', text: 'Wash clothes around bed with hot water & deep clean house/dust', completed: false },
      { id: 'sub-1-3', text: 'Mix & apply chemical safely to bed, sofa & mattress (focus on hidden areas)', completed: false },
      { id: 'sub-1-4', text: 'PPE & Protocol: Keep treated area closed for 2 days, wear mask & gloves', completed: false },
    ],
    evaluation: 0,
    category: 'Cleaning',
    safetyNotes: 'Wear mask & gloves. Seal treated room for 48 hours.',
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'sched-2',
    day: 'Wednesday',
    responsible: 'Kibrom',
    keyActivities: `Clean bed and sofa joints with hot water Ensure proper ventilation Find buyers for old sofa & bed  If sold, search for replacement bed & Majlis
Search for kitchen/shower drainage, boiler & gas solutions`,
    subtasks: [
      { id: 'sub-2-1', text: 'Clean bed and sofa joints with hot water & ensure proper ventilation', completed: false },
      { id: 'sub-2-2', text: 'List and find buyers for old sofa & bed', completed: false },
      { id: 'sub-2-3', text: 'If sold, search for replacement bed & Majlis', completed: false },
      { id: 'sub-2-4', text: 'Search for kitchen/shower drainage, boiler & gas solutions', completed: false },
    ],
    evaluation: 0,
    category: 'Maintenance',
    safetyNotes: 'Maintain active cross-ventilation during hot water cleaning.',
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'sched-3',
    day: 'Thursday',
    responsible: 'Assaye & Kibrom',
    keyActivities: 'Family holiday/visits',
    subtasks: [
      { id: 'sub-3-1', text: 'Family holiday and visit coordination', completed: false },
      { id: 'sub-3-2', text: 'Check in on maintenance progress before departure', completed: false },
    ],
    evaluation: 0,
    category: 'Family',
    safetyNotes: 'Ensure house windows and utilities are secured before leaving.',
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'sched-4',
    day: 'Fri-Sun',
    responsible: 'Assaye & Kibrom',
    keyActivities: `Friday morning: Bante's Mom
Saturday morning: My Mom
Fix kitchen drainage
Fix shower drainage`,
    subtasks: [
      { id: 'sub-4-1', text: "Friday morning: Visit Bante's Mom", completed: false },
      { id: 'sub-4-2', text: 'Saturday morning: Visit My Mom', completed: false },
      { id: 'sub-4-3', text: 'Fix and unblock kitchen drainage', completed: false },
      { id: 'sub-4-4', text: 'Fix and clear shower drainage', completed: false },
    ],
    evaluation: 0,
    category: 'Plumbing',
    safetyNotes: 'Test water flow and inspect traps for leakage after fixing.',
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'sched-5',
    day: 'Next Mon-Wed',
    responsible: 'Kibrom',
    keyActivities: `Fix kitchen drainage Fix shower drainage
Complete related plumbing work`,
    subtasks: [
      { id: 'sub-5-1', text: 'Inspect and fix kitchen drainage lines', completed: false },
      { id: 'sub-5-2', text: 'Inspect and fix shower drainage lines', completed: false },
      { id: 'sub-5-3', text: 'Complete all related plumbing pipework and testing', completed: false },
    ],
    evaluation: 0,
    category: 'Plumbing',
    safetyNotes: 'Turn off primary stopcock before pipe disassembly.',
    updatedAt: new Date().toISOString(),
  },
];

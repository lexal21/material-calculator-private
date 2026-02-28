// Test undo stack implementation
console.log('=== UNDO STACK TEST ===\n');

// Simulate window.supplementItems
const supplementItems = [
  { id: 'item_1', name: 'Fascia', quantity: 296.92, unit: 'LF' },
  { id: 'item_2', name: 'Pipe Jack #1', quantity: 1, unit: 'EA' },
  { id: 'item_3', name: 'Pipe Jack #2', quantity: 1, unit: 'EA' },
  { id: 'item_4', name: 'Pipe Jack #3', quantity: 1, unit: 'EA' },
  { id: 'item_5', name: 'Pipe Jack #4', quantity: 1, unit: 'EA' }
];

const undoStack = [];

function showItems(label) {
  console.log(label);
  supplementItems.forEach((item, idx) => {
    console.log(`  [${idx}] ${item.name} (${item.id})`);
  });
  console.log('');
}

function deleteItem(id) {
  const itemIndex = supplementItems.findIndex(item => item.id === id);
  if (itemIndex === -1) {
    console.log('Item not found:', id);
    return;
  }
  
  const itemToDelete = supplementItems[itemIndex];
  
  // Push onto undo stack
  undoStack.push({
    type: 'delete',
    item: JSON.parse(JSON.stringify(itemToDelete)),
    index: itemIndex
  });
  
  console.log(`DELETE: ${itemToDelete.name} at index ${itemIndex}`);
  
  // Delete
  supplementItems.splice(itemIndex, 1);
  
  console.log(`Stack depth: ${undoStack.length}\n`);
}

function undo() {
  if (undoStack.length === 0) {
    console.log('Nothing to undo\n');
    return;
  }
  
  const lastAction = undoStack.pop();
  
  console.log(`UNDO: Re-inserting ${lastAction.item.name} at index ${lastAction.index}`);
  
  // Re-insert at original position
  supplementItems.splice(lastAction.index, 0, lastAction.item);
  
  console.log(`Stack depth: ${undoStack.length}\n`);
}

// Test scenario
showItems('INITIAL STATE (5 items):');

deleteItem('item_3'); // Delete Pipe Jack #2 (index 2)
showItems('After deleting Pipe Jack #2:');

deleteItem('item_5'); // Delete Pipe Jack #4 (now at index 3)
showItems('After deleting Pipe Jack #4:');

deleteItem('item_1'); // Delete Fascia (index 0)
showItems('After deleting Fascia (3 deletions total):');

console.log('--- TESTING UNDO IN REVERSE ORDER ---\n');

undo(); // Should restore Fascia at index 0
showItems('After 1st undo (restore Fascia):');

undo(); // Should restore Pipe Jack #4 at index 3
showItems('After 2nd undo (restore Pipe Jack #4):');

undo(); // Should restore Pipe Jack #2 at index 2
showItems('After 3rd undo (restore Pipe Jack #2):');

undo(); // Should say "Nothing to undo"

console.log('=== TEST RESULTS ===');
if (supplementItems.length === 5 &&
    supplementItems[0].id === 'item_1' &&
    supplementItems[1].id === 'item_2' &&
    supplementItems[2].id === 'item_3' &&
    supplementItems[3].id === 'item_4' &&
    supplementItems[4].id === 'item_5') {
  console.log('✓ PASS: All items restored to original order');
  console.log('✓ Undo stack implementation is correct');
} else {
  console.log('✗ FAIL: Items not in correct order');
  console.log('Final items:', supplementItems.map(i => i.id));
}

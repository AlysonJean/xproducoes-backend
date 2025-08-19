import fetch from 'node-fetch';
import jwt from 'jsonwebtoken';

(async function main(){
  const base = 'http://localhost:4000';
  const token = process.env.E2E_TOKEN;
  if(!token){
    console.error('E2E_TOKEN not provided');
    process.exit(1);
  }

  // Create a kit if none exists
  const kitsResp = await fetch(base + '/api/v1/kits', { headers: { Authorization: `Bearer ${token}` } });
  let kits = [];
  if (kitsResp.ok) kits = await kitsResp.json().then(r=>r.data||[]);
  let kitId = kits[0]?.id;
  if(!kitId){
    const createKit = await fetch(base + '/api/v1/kits', { method: 'POST', headers: { 'Content-Type':'application/json', Authorization:`Bearer ${token}` }, body: JSON.stringify({ name: 'E2E Kit', price: 100.00, imageUrl: '', description: 'Test kit' }) });
    const body = await createKit.json();
    kitId = body.data.id;
  }

  // Build booking payload
  const futureDate = new Date(Date.now() + 1000 * 60 * 60 * 24 * 7); // +7 days
  const payload = {
    kitId,
    eventDate: futureDate.toISOString(),
    eventEndDate: new Date(futureDate.getTime()+1000*60*60*4).toISOString(),
    clientName: 'E2E Client',
    clientContact: '+5511999999999',
    clientEmail: 'client-e2e@example.com',
    location: 'Local Test',
    notes: 'E2E booking test'
  };

  console.log('Creating booking...');
  const res = await fetch(base + '/api/v1/booking', { method: 'POST', headers: { 'Content-Type':'application/json', Authorization:`Bearer ${token}` }, body: JSON.stringify(payload) });
  const created = await res.json();
  console.log('Create status', res.status, created.success);
  if(!created || !created.data){
    console.error('Failed to create booking', created);
    process.exit(1);
  }
  const bookingId = created.data.id;
  console.log('Booking created', bookingId);

  // Confirm with details
  const confirmPayload = {
    totalPrice: 200.00,
    collaborators: [ { collaboratorId: null, role: 'PHOTOGRAPHER', startTime: '09:00', endTime: '13:00', fixedRate: 150.00 } ]
  };

  console.log('Confirming booking with details...');
  const confirmRes = await fetch(base + `/api/v1/booking/${bookingId}/confirm-details`, { method: 'PUT', headers: { 'Content-Type':'application/json', Authorization:`Bearer ${token}` }, body: JSON.stringify(confirmPayload) });
  const confirmBody = await confirmRes.json();
  console.log('Confirm status', confirmRes.status, confirmBody.success);
  if(!confirmBody.success) {
    console.error('Confirm failed', confirmBody);
    process.exit(1);
  }

  console.log('E2E test passed: booking confirmed.');
  process.exit(0);
})();

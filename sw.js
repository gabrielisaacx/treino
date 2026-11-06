/* Cache simples: abre offline depois da primeira visita. Rede primeiro, cache como reserva. */
var CACHE = "treino-v11";
var ASSETS = ["./", "./index.html", "./manifest.webmanifest", "./icon-192.png", "./icon-512.png"];
var IMGS = ["Barbell_Curl_0.jpg", "Barbell_Curl_1.jpg", "Barbell_Hip_Thrust_0.jpg", "Barbell_Hip_Thrust_1.jpg", "Bent_Over_Two-Dumbbell_Row_0.jpg", "Bent_Over_Two-Dumbbell_Row_1.jpg", "Bodyweight_Squat_0.jpg", "Bodyweight_Squat_1.jpg", "Bodyweight_Walking_Lunge_0.jpg", "Bodyweight_Walking_Lunge_1.jpg", "Butt_Lift_Bridge_0.jpg", "Butt_Lift_Bridge_1.jpg", "Butterfly_0.jpg", "Butterfly_1.jpg", "Cable_Crunch_0.jpg", "Cable_Crunch_1.jpg", "Dead_Bug_0.jpg", "Dead_Bug_1.jpg", "Face_Pull_0.jpg", "Face_Pull_1.jpg", "Flat_Bench_Lying_Leg_Raise_0.jpg", "Flat_Bench_Lying_Leg_Raise_1.jpg", "Hammer_Curls_0.jpg", "Hammer_Curls_1.jpg", "Incline_Dumbbell_Press_0.jpg", "Incline_Dumbbell_Press_1.jpg", "Leg_Extensions_0.jpg", "Leg_Extensions_1.jpg", "Leg_Press_0.jpg", "Leg_Press_1.jpg", "Leverage_Iso_Row_0.jpg", "Leverage_Iso_Row_1.jpg", "Leverage_Shoulder_Press_0.jpg", "Leverage_Shoulder_Press_1.jpg", "Lying_Leg_Curls_0.jpg", "Lying_Leg_Curls_1.jpg", "Machine_Bench_Press_0.jpg", "Machine_Bench_Press_1.jpg", "Mountain_Climbers_0.jpg", "Mountain_Climbers_1.jpg", "One-Arm_Dumbbell_Row_0.jpg", "One-Arm_Dumbbell_Row_1.jpg", "One-Legged_Cable_Kickback_0.jpg", "One-Legged_Cable_Kickback_1.jpg", "Plank_0.jpg", "Plank_1.jpg", "Plie_Dumbbell_Squat_0.jpg", "Plie_Dumbbell_Squat_1.jpg", "Pushups_0.jpg", "Pushups_1.jpg", "Seated_Cable_Rows_0.jpg", "Seated_Cable_Rows_1.jpg", "Side_Lateral_Raise_0.jpg", "Side_Lateral_Raise_1.jpg", "Standing_Calf_Raises_0.jpg", "Standing_Calf_Raises_1.jpg", "Stiff-Legged_Dumbbell_Deadlift_0.jpg", "Stiff-Legged_Dumbbell_Deadlift_1.jpg", "Thigh_Abductor_0.jpg", "Thigh_Abductor_1.jpg", "Triceps_Pushdown_-_Rope_Attachment_0.jpg", "Triceps_Pushdown_-_Rope_Attachment_1.jpg", "Triceps_Pushdown_0.jpg", "Triceps_Pushdown_1.jpg", "Wide-Grip_Lat_Pulldown_0.jpg", "Wide-Grip_Lat_Pulldown_1.jpg"];
ASSETS = ASSETS.concat(IMGS.map(function (f) { return "./img/" + f; }));
self.addEventListener("install", function (e) {
  e.waitUntil(caches.open(CACHE).then(function (c) { return c.addAll(ASSETS); }).then(function () { return self.skipWaiting(); }));
});
self.addEventListener("activate", function (e) {
  e.waitUntil(caches.keys().then(function (ks) {
    return Promise.all(ks.filter(function (k) { return k !== CACHE; }).map(function (k) { return caches.delete(k); }));
  }).then(function () { return self.clients.claim(); }));
});
self.addEventListener("fetch", function (e) {
  if (e.request.method !== "GET") return;
  e.respondWith(fetch(e.request).then(function (r) {
    if (r && r.status === 200 && (r.type === "basic" || r.type === "cors")) {
      var copy = r.clone();
      caches.open(CACHE).then(function (c) { c.put(e.request, copy); });
    }
    return r;
  }).catch(function () { return caches.match(e.request).then(function (m) { return m || caches.match("./index.html"); }); }));
});

db = db.getSiblingDB('codereview');

db.createCollection('users');
db.createCollection('organizations');
db.createCollection('teams');
db.createCollection('subscriptions');
db.createCollection('reviews');
db.createCollection('comments');
db.createCollection('auditlogs');

db.users.createIndex({ githubId: 1 }, { unique: true });
db.organizations.createIndex({ slug: 1 }, { unique: true });
db.teams.createIndex({ organizationId: 1, slug: 1 }, { unique: true });
db.reviews.createIndex({ owner: 1, repo: 1, pullNumber: 1 }, { unique: true });
db.auditlogs.createIndex({ organizationId: 1, timestamp: -1 });

print('MongoDB initialized with collections and composite indices');

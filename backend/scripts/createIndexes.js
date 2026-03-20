const mongoose = require('mongoose');
require('dotenv').config();

async function createIndexes() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    const db = mongoose.connection.db;
    
    // Create text search index for jobs
    console.log('Creating text search index for jobs...');
    await db.collection('jobs').createIndex(
      { 
        title: "text", 
        description: "text",
        "company.name": "text",
        location: "text"
      },
      {
        name: "jobs_text_search",
        weights: {
          title: 10,
          description: 5,
          "company.name": 3,
          location: 2
        }
      }
    );
    console.log('Text search index created for jobs');

    // Create compound indexes for applications
    console.log('Creating compound indexes for applications...');
    await db.collection('applications').createIndex(
      { job: 1, applicant: 1 },
      { 
        unique: true,
        name: "unique_job_applicant"
      }
    );
    
    await db.collection('applications').createIndex(
      { applicant: 1, status: 1 },
      { name: "applicant_status_index" }
    );
    
    await db.collection('applications').createIndex(
      { job: 1, status: 1 },
      { name: "job_status_index" }
    );
    console.log('Compound indexes created for applications');

    // Create indexes for users
    console.log('Creating indexes for users...');
    await db.collection('users').createIndex(
      { email: 1 },
      { unique: true, name: "unique_email" }
    );
    
    await db.collection('users').createIndex(
      { "profile.skills": 1 },
      { name: "skills_index" }
    );
    
    await db.collection('users').createIndex(
      { "profile.location": 1 },
      { name: "location_index" }
    );
    console.log('Indexes created for users');

    // Create indexes for jobs
    console.log('Creating additional indexes for jobs...');
    await db.collection('jobs').createIndex(
      { postedBy: 1 },
      { name: "postedBy_index" }
    );
    
    await db.collection('jobs').createIndex(
      { status: 1, expiryDate: 1 },
      { name: "status_expiry_index" }
    );
    
    await db.collection('jobs').createIndex(
      { featured: 1, createdAt: -1 },
      { name: "featured_created_index" }
    );
    console.log('Additional indexes created for jobs');

    console.log('All indexes created successfully!');
    
  } catch (error) {
    console.error('Error creating indexes:', error);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Disconnected from MongoDB');
  }
}

// Run if called directly
if (require.main === module) {
  createIndexes();
}

module.exports = createIndexes;

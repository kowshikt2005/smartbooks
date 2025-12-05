import { NextRequest, NextResponse } from 'next/server';

export async function GET() {
  try {
    console.log('Test API called');
    
    // Test environment variables
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    
    console.log('Environment check:', {
      hasUrl: !!supabaseUrl,
      hasKey: !!supabaseKey,
      nodeEnv: process.env.NODE_ENV
    });
    
    return NextResponse.json({
      success: true,
      message: 'Test API working',
      env: {
        hasSupabaseUrl: !!supabaseUrl,
        hasSupabaseKey: !!supabaseKey,
        nodeEnv: process.env.NODE_ENV
      }
    });
  } catch (error) {
    console.error('Test API error:', error);
    return NextResponse.json(
      { 
        error: 'Test API failed',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    console.log('Test POST API called');
    
    // Test importing the mapping service
    const { WhatsAppMappingService } = await import('../../../../lib/services/whatsappMapping');
    console.log('WhatsAppMappingService imported successfully');
    
    // Test importing contact service
    const { CustomerService } = await import('../../../../lib/services/customers');
    console.log('CustomerService imported successfully');
    
    return NextResponse.json({
      success: true,
      message: 'Test POST API working',
      services: {
        mappingService: !!WhatsAppMappingService,
        contactService: !!CustomerService
      }
    });
  } catch (error) {
    console.error('Test POST API error:', error);
    return NextResponse.json(
      { 
        error: 'Test POST API failed',
        details: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined
      },
      { status: 500 }
    );
  }
}
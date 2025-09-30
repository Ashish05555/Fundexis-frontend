const BASE_URL = 'https://fundexis-backend-758832599619.us-central1.run.app';

export async function searchInstruments(query) {
  try {
    const response = await fetch(`${BASE_URL}/search-instruments?query=${query}`);
    if (!response.ok) {
      throw new Error('No matching instruments found');
    }
    return await response.json();
  } catch (error) {
    console.error('Error fetching instruments:', error);
    throw error;
  }
}

export async function getInstrumentDetails(id) {
  try {
    const response = await fetch(`${BASE_URL}/instrument/${id}`);
    if (!response.ok) {
      throw new Error('Instrument not found');
    }
    return await response.json();
  } catch (error) {
    console.error('Error fetching instrument details:', error);
    throw error;
  }
}
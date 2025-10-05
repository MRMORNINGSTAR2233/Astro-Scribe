from neo4j import GraphDatabase
import os
import logging
from typing import List, Dict, Any, Optional
import streamlit as st

logger = logging.getLogger(__name__)

class Neo4jManager:
    def __init__(self):
        self.uri = os.getenv('NEO4J_URI', 'bolt://localhost:7687')
        self.user = os.getenv('NEO4J_USER', 'neo4j')
        self.password = os.getenv('NEO4J_PASSWORD', 'neo4j_password')
        self.driver = None
        self._connect()
    
    def _connect(self):
        """Establish connection to Neo4j"""
        try:
            self.driver = GraphDatabase.driver(self.uri, auth=(self.user, self.password))
            # Test connection
            with self.driver.session() as session:
                session.run("RETURN 1")
            logger.info("Successfully connected to Neo4j")
        except Exception as e:
            logger.error(f"Failed to connect to Neo4j: {e}")
            self.driver = None
    
    def close(self):
        """Close the connection"""
        if self.driver:
            self.driver.close()
    
    def create_document_node(self, document_data: Dict) -> bool:
        """Create a document node in the knowledge graph"""
        if not self.driver:
            return False
        
        try:
            with self.driver.session() as session:
                query = """
                CREATE (d:Document {
                    id: $id,
                    filename: $filename,
                    title: $title,
                    file_type: $file_type,
                    upload_date: $upload_date,
                    summary: $summary
                })
                """
                session.run(query, document_data)
                return True
        except Exception as e:
            logger.error(f"Error creating document node: {e}")
            return False
    
    def create_entity_node(self, entity_data: Dict) -> bool:
        """Create an entity node in the knowledge graph"""
        if not self.driver:
            return False
        
        try:
            with self.driver.session() as session:
                # Create node with dynamic label based on entity type
                entity_type = entity_data.get('entity_type', 'Entity').replace(' ', '_')
                query = f"""
                CREATE (e:{entity_type}:Entity {{
                    id: $id,
                    name: $name,
                    description: $description,
                    entity_type: $entity_type
                }})
                """
                session.run(query, entity_data)
                return True
        except Exception as e:
            logger.error(f"Error creating entity node: {e}")
            return False
    
    def create_relationship(self, source_id: str, target_id: str, relationship_type: str, properties: Dict = None) -> bool:
        """Create a relationship between two nodes"""
        if not self.driver:
            return False
        
        try:
            with self.driver.session() as session:
                query = """
                MATCH (s {id: $source_id}), (t {id: $target_id})
                CREATE (s)-[r:""" + relationship_type.replace(' ', '_').upper() + """ $properties]->(t)
                """
                session.run(query, {
                    'source_id': source_id,
                    'target_id': target_id,
                    'properties': properties or {}
                })
                return True
        except Exception as e:
            logger.error(f"Error creating relationship: {e}")
            return False
    
    def find_entities_by_name(self, name: str, limit: int = 10) -> List[Dict]:
        """Find entities by name (fuzzy search)"""
        if not self.driver:
            return []
        
        try:
            with self.driver.session() as session:
                query = """
                MATCH (e:Entity)
                WHERE toLower(e.name) CONTAINS toLower($name)
                RETURN e
                LIMIT $limit
                """
                result = session.run(query, {'name': name, 'limit': limit})
                return [dict(record['e']) for record in result]
        except Exception as e:
            logger.error(f"Error finding entities: {e}")
            return []
    
    def get_entity_relationships(self, entity_id: str) -> List[Dict]:
        """Get all relationships for an entity"""
        if not self.driver:
            return []
        
        try:
            with self.driver.session() as session:
                query = """
                MATCH (e {id: $entity_id})-[r]-(connected)
                RETURN e, r, connected
                """
                result = session.run(query, {'entity_id': entity_id})
                relationships = []
                for record in result:
                    relationships.append({
                        'source': dict(record['e']),
                        'relationship': dict(record['r']),
                        'target': dict(record['connected'])
                    })
                return relationships
        except Exception as e:
            logger.error(f"Error getting entity relationships: {e}")
            return []
    
    def find_shortest_path(self, entity1_id: str, entity2_id: str) -> List[Dict]:
        """Find the shortest path between two entities"""
        if not self.driver:
            return []
        
        try:
            with self.driver.session() as session:
                query = """
                MATCH (e1 {id: $entity1_id}), (e2 {id: $entity2_id})
                MATCH path = shortestPath((e1)-[*]-(e2))
                RETURN path
                """
                result = session.run(query, {
                    'entity1_id': entity1_id,
                    'entity2_id': entity2_id
                })
                paths = []
                for record in result:
                    path = record['path']
                    path_data = {
                        'nodes': [dict(node) for node in path.nodes],
                        'relationships': [dict(rel) for rel in path.relationships]
                    }
                    paths.append(path_data)
                return paths
        except Exception as e:
            logger.error(f"Error finding shortest path: {e}")
            return []
    
    def get_related_entities(self, entity_id: str, relationship_types: List[str] = None, limit: int = 10) -> List[Dict]:
        """Get entities related to a given entity"""
        if not self.driver:
            return []
        
        try:
            with self.driver.session() as session:
                if relationship_types:
                    rel_filter = "|".join([f":{rel_type}" for rel_type in relationship_types])
                    query = f"""
                    MATCH (e {{id: $entity_id}})-[r{rel_filter}]-(related)
                    RETURN related, type(r) as relationship_type
                    LIMIT $limit
                    """
                else:
                    query = """
                    MATCH (e {id: $entity_id})-[r]-(related)
                    RETURN related, type(r) as relationship_type
                    LIMIT $limit
                    """
                
                result = session.run(query, {'entity_id': entity_id, 'limit': limit})
                related_entities = []
                for record in result:
                    related_entities.append({
                        'entity': dict(record['related']),
                        'relationship_type': record['relationship_type']
                    })
                return related_entities
        except Exception as e:
            logger.error(f"Error getting related entities: {e}")
            return []
    
    def search_entities_by_type(self, entity_type: str, limit: int = 50) -> List[Dict]:
        """Search entities by type"""
        if not self.driver:
            return []
        
        try:
            with self.driver.session() as session:
                query = """
                MATCH (e:Entity)
                WHERE e.entity_type = $entity_type
                RETURN e
                LIMIT $limit
                """
                result = session.run(query, {'entity_type': entity_type, 'limit': limit})
                return [dict(record['e']) for record in result]
        except Exception as e:
            logger.error(f"Error searching entities by type: {e}")
            return []
    
    def get_graph_statistics(self) -> Dict:
        """Get statistics about the knowledge graph"""
        if not self.driver:
            return {}
        
        try:
            with self.driver.session() as session:
                stats = {}
                
                # Count nodes
                result = session.run("MATCH (n) RETURN count(n) as node_count")
                stats['total_nodes'] = result.single()['node_count']
                
                # Count relationships
                result = session.run("MATCH ()-[r]->() RETURN count(r) as rel_count")
                stats['total_relationships'] = result.single()['rel_count']
                
                # Count by entity type
                result = session.run("""
                MATCH (e:Entity)
                RETURN e.entity_type as entity_type, count(e) as count
                ORDER BY count DESC
                """)
                stats['entity_types'] = [dict(record) for record in result]
                
                # Count by relationship type
                result = session.run("""
                MATCH ()-[r]->()
                RETURN type(r) as relationship_type, count(r) as count
                ORDER BY count DESC
                """)
                stats['relationship_types'] = [dict(record) for record in result]
                
                return stats
        except Exception as e:
            logger.error(f"Error getting graph statistics: {e}")
            return {}
    
    def search_graph(self, query_text: str, limit: int = 20) -> List[Dict]:
        """Search the entire graph for entities and relationships matching the query"""
        if not self.driver:
            return []
        
        try:
            with self.driver.session() as session:
                # Search entities by name and description
                entity_query = """
                MATCH (e:Entity)
                WHERE toLower(e.name) CONTAINS toLower($query)
                   OR toLower(e.description) CONTAINS toLower($query)
                RETURN e, 'entity' as result_type
                LIMIT $limit
                """
                
                result = session.run(entity_query, {'query': query_text, 'limit': limit})
                search_results = []
                
                for record in result:
                    search_results.append({
                        'data': dict(record['e']),
                        'type': record['result_type']
                    })
                
                return search_results
        except Exception as e:
            logger.error(f"Error searching graph: {e}")
            return []
    
    def create_document_entity_relationship(self, document_id: str, entity_id: str, relationship_type: str = "MENTIONS") -> bool:
        """Create a relationship between a document and an entity"""
        if not self.driver:
            return False
        
        try:
            with self.driver.session() as session:
                query = f"""
                MATCH (d:Document {{id: $document_id}}), (e:Entity {{id: $entity_id}})
                CREATE (d)-[r:{relationship_type}]->(e)
                """
                session.run(query, {
                    'document_id': document_id,
                    'entity_id': entity_id
                })
                return True
        except Exception as e:
            logger.error(f"Error creating document-entity relationship: {e}")
            return False

# Initialize Neo4j manager
@st.cache_resource
def get_neo4j_manager():
    return Neo4jManager()
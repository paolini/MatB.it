import fs from 'node:fs';
import path from 'node:path';
import { buildASTSchema, parse, validate } from 'graphql';
import { typeDefs } from '../typedefs';

describe('Note reference creation', () => {
  it('accepts the modal creation mutation against the server schema (issue #93)', () => {
    // Read the actual client operation without loading React or a browser.
    // Copying the mutation here would let the test drift from the editor.
    const source = fs.readFileSync(
      path.resolve(process.cwd(), 'src/components/NoteReferenceModal.tsx'),
      'utf8',
    );
    const match = source.match(/const NewNoteMutation = gql`([\s\S]*?)`/);
    if (!match) throw new Error('NewNoteMutation not found in NoteReferenceModal');

    const errors = validate(buildASTSchema(typeDefs), parse(match[1]));

    expect(errors.map(error => error.message)).toEqual([]);
  });
});

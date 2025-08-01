import { GraphQLResolveInfo, GraphQLScalarType, GraphQLScalarTypeConfig } from 'graphql';
import { Context } from './types';
export type Maybe<T> = T | null;
export type InputMaybe<T> = Maybe<T>;
export type Exact<T extends { [key: string]: unknown }> = { [K in keyof T]: T[K] };
export type MakeOptional<T, K extends keyof T> = Omit<T, K> & { [SubKey in K]?: Maybe<T[SubKey]> };
export type MakeMaybe<T, K extends keyof T> = Omit<T, K> & { [SubKey in K]: Maybe<T[SubKey]> };
export type MakeEmpty<T extends { [key: string]: unknown }, K extends keyof T> = { [_ in K]?: never };
export type Incremental<T> = T | { [P in keyof T]?: P extends ' $fragmentName' | '__typename' ? T[P] : never };
export type RequireFields<T, K extends keyof T> = Omit<T, K> & { [P in K]-?: NonNullable<T[P]> };
/** All built-in and custom scalars, mapped to their actual values */
export type Scalars = {
  ID: { input: string; output: string; }
  String: { input: string; output: string; }
  Boolean: { input: boolean; output: boolean; }
  Int: { input: number; output: number; }
  Float: { input: number; output: number; }
  JSON: { input: any; output: any; }
  ObjectId: { input: any; output: any; }
  Timestamp: { input: any; output: any; }
};

export type Mutation = {
  __typename?: 'Mutation';
  deleteNote: Maybe<Scalars['Boolean']['output']>;
  deleteTest: Maybe<Scalars['Boolean']['output']>;
  newNote: Maybe<Note>;
  newSubmission: Scalars['ObjectId']['output'];
  newTest: Maybe<Scalars['Boolean']['output']>;
  updateNote: Maybe<Note>;
};


export type MutationDeleteNoteArgs = {
  _id: Scalars['ObjectId']['input'];
};


export type MutationDeleteTestArgs = {
  _id: Scalars['ObjectId']['input'];
};


export type MutationNewNoteArgs = {
  delta: InputMaybe<Scalars['JSON']['input']>;
  private: InputMaybe<Scalars['Boolean']['input']>;
  title: Scalars['String']['input'];
  variant: InputMaybe<Scalars['String']['input']>;
};


export type MutationNewSubmissionArgs = {
  test_id: Scalars['ObjectId']['input'];
};


export type MutationNewTestArgs = {
  note_id: Scalars['ObjectId']['input'];
  title: InputMaybe<Scalars['String']['input']>;
};


export type MutationUpdateNoteArgs = {
  _id: Scalars['ObjectId']['input'];
  delta: InputMaybe<Scalars['JSON']['input']>;
  private: InputMaybe<Scalars['Boolean']['input']>;
  title: InputMaybe<Scalars['String']['input']>;
  variant: InputMaybe<Scalars['String']['input']>;
};

export type Note = {
  __typename?: 'Note';
  _id: Scalars['ObjectId']['output'];
  author: User;
  author_id: Scalars['ObjectId']['output'];
  created_on: Scalars['Timestamp']['output'];
  delta: Maybe<Scalars['JSON']['output']>;
  private: Scalars['Boolean']['output'];
  tests: Array<Test>;
  title: Scalars['String']['output'];
  updated_on: Scalars['Timestamp']['output'];
  variant: Maybe<Scalars['String']['output']>;
};

export type Profile = {
  __typename?: 'Profile';
  _id: Scalars['ObjectId']['output'];
  email: Maybe<Scalars['String']['output']>;
  image: Maybe<Scalars['String']['output']>;
  name: Maybe<Scalars['String']['output']>;
};

export type Query = {
  __typename?: 'Query';
  hello: Scalars['String']['output'];
  note: Maybe<Note>;
  notes: Array<Note>;
  profile: Maybe<Profile>;
  submission: Maybe<Submission>;
  test: Maybe<Test>;
};


export type QueryNoteArgs = {
  _id: Scalars['ObjectId']['input'];
};


export type QuerySubmissionArgs = {
  _id: Scalars['ObjectId']['input'];
};


export type QueryTestArgs = {
  _id: Scalars['ObjectId']['input'];
};

export type Submission = {
  __typename?: 'Submission';
  _id: Scalars['ObjectId']['output'];
  answers: Maybe<Scalars['JSON']['output']>;
  author: User;
  author_id: Scalars['ObjectId']['output'];
  completed_on: Maybe<Scalars['Timestamp']['output']>;
  score: Maybe<Scalars['Float']['output']>;
  started_on: Scalars['Timestamp']['output'];
  test: Test;
  test_id: Scalars['ObjectId']['output'];
};

export type Test = {
  __typename?: 'Test';
  _id: Scalars['ObjectId']['output'];
  author: User;
  author_id: Scalars['ObjectId']['output'];
  close_on: Maybe<Scalars['Timestamp']['output']>;
  created_on: Scalars['Timestamp']['output'];
  my_submissions: Array<Submission>;
  note: Note;
  note_id: Scalars['ObjectId']['output'];
  open_on: Maybe<Scalars['Timestamp']['output']>;
  title: Maybe<Scalars['String']['output']>;
};

export type User = {
  __typename?: 'User';
  _id: Scalars['ObjectId']['output'];
  image: Maybe<Scalars['String']['output']>;
  name: Maybe<Scalars['String']['output']>;
};

export type WithIndex<TObject> = TObject & Record<string, any>;
export type ResolversObject<TObject> = WithIndex<TObject>;

export type ResolverTypeWrapper<T> = Promise<T> | T;


export type ResolverWithResolve<TResult, TParent, TContext, TArgs> = {
  resolve: ResolverFn<TResult, TParent, TContext, TArgs>;
};
export type Resolver<TResult, TParent = {}, TContext = {}, TArgs = {}> = ResolverFn<TResult, TParent, TContext, TArgs> | ResolverWithResolve<TResult, TParent, TContext, TArgs>;

export type ResolverFn<TResult, TParent, TContext, TArgs> = (
  parent: TParent,
  args: TArgs,
  context: TContext,
  info: GraphQLResolveInfo
) => Promise<TResult> | TResult;

export type SubscriptionSubscribeFn<TResult, TParent, TContext, TArgs> = (
  parent: TParent,
  args: TArgs,
  context: TContext,
  info: GraphQLResolveInfo
) => AsyncIterable<TResult> | Promise<AsyncIterable<TResult>>;

export type SubscriptionResolveFn<TResult, TParent, TContext, TArgs> = (
  parent: TParent,
  args: TArgs,
  context: TContext,
  info: GraphQLResolveInfo
) => TResult | Promise<TResult>;

export interface SubscriptionSubscriberObject<TResult, TKey extends string, TParent, TContext, TArgs> {
  subscribe: SubscriptionSubscribeFn<{ [key in TKey]: TResult }, TParent, TContext, TArgs>;
  resolve?: SubscriptionResolveFn<TResult, { [key in TKey]: TResult }, TContext, TArgs>;
}

export interface SubscriptionResolverObject<TResult, TParent, TContext, TArgs> {
  subscribe: SubscriptionSubscribeFn<any, TParent, TContext, TArgs>;
  resolve: SubscriptionResolveFn<TResult, any, TContext, TArgs>;
}

export type SubscriptionObject<TResult, TKey extends string, TParent, TContext, TArgs> =
  | SubscriptionSubscriberObject<TResult, TKey, TParent, TContext, TArgs>
  | SubscriptionResolverObject<TResult, TParent, TContext, TArgs>;

export type SubscriptionResolver<TResult, TKey extends string, TParent = {}, TContext = {}, TArgs = {}> =
  | ((...args: any[]) => SubscriptionObject<TResult, TKey, TParent, TContext, TArgs>)
  | SubscriptionObject<TResult, TKey, TParent, TContext, TArgs>;

export type TypeResolveFn<TTypes, TParent = {}, TContext = {}> = (
  parent: TParent,
  context: TContext,
  info: GraphQLResolveInfo
) => Maybe<TTypes> | Promise<Maybe<TTypes>>;

export type IsTypeOfResolverFn<T = {}, TContext = {}> = (obj: T, context: TContext, info: GraphQLResolveInfo) => boolean | Promise<boolean>;

export type NextResolverFn<T> = () => Promise<T>;

export type DirectiveResolverFn<TResult = {}, TParent = {}, TContext = {}, TArgs = {}> = (
  next: NextResolverFn<TResult>,
  parent: TParent,
  args: TArgs,
  context: TContext,
  info: GraphQLResolveInfo
) => TResult | Promise<TResult>;



/** Mapping between all available schema types and the resolvers types */
export type ResolversTypes = ResolversObject<{
  Boolean: ResolverTypeWrapper<Scalars['Boolean']['output']>;
  Float: ResolverTypeWrapper<Scalars['Float']['output']>;
  JSON: ResolverTypeWrapper<Scalars['JSON']['output']>;
  Mutation: ResolverTypeWrapper<{}>;
  Note: ResolverTypeWrapper<Note>;
  ObjectId: ResolverTypeWrapper<Scalars['ObjectId']['output']>;
  Profile: ResolverTypeWrapper<Profile>;
  Query: ResolverTypeWrapper<{}>;
  String: ResolverTypeWrapper<Scalars['String']['output']>;
  Submission: ResolverTypeWrapper<Submission>;
  Test: ResolverTypeWrapper<Test>;
  Timestamp: ResolverTypeWrapper<Scalars['Timestamp']['output']>;
  User: ResolverTypeWrapper<User>;
}>;

/** Mapping between all available schema types and the resolvers parents */
export type ResolversParentTypes = ResolversObject<{
  Boolean: Scalars['Boolean']['output'];
  Float: Scalars['Float']['output'];
  JSON: Scalars['JSON']['output'];
  Mutation: {};
  Note: Note;
  ObjectId: Scalars['ObjectId']['output'];
  Profile: Profile;
  Query: {};
  String: Scalars['String']['output'];
  Submission: Submission;
  Test: Test;
  Timestamp: Scalars['Timestamp']['output'];
  User: User;
}>;

export interface JsonScalarConfig extends GraphQLScalarTypeConfig<ResolversTypes['JSON'], any> {
  name: 'JSON';
}

export type MutationResolvers<ContextType = Context, ParentType extends ResolversParentTypes['Mutation'] = ResolversParentTypes['Mutation']> = ResolversObject<{
  deleteNote: Resolver<Maybe<ResolversTypes['Boolean']>, ParentType, ContextType, RequireFields<MutationDeleteNoteArgs, '_id'>>;
  deleteTest: Resolver<Maybe<ResolversTypes['Boolean']>, ParentType, ContextType, RequireFields<MutationDeleteTestArgs, '_id'>>;
  newNote: Resolver<Maybe<ResolversTypes['Note']>, ParentType, ContextType, RequireFields<MutationNewNoteArgs, 'title'>>;
  newSubmission: Resolver<ResolversTypes['ObjectId'], ParentType, ContextType, RequireFields<MutationNewSubmissionArgs, 'test_id'>>;
  newTest: Resolver<Maybe<ResolversTypes['Boolean']>, ParentType, ContextType, RequireFields<MutationNewTestArgs, 'note_id'>>;
  updateNote: Resolver<Maybe<ResolversTypes['Note']>, ParentType, ContextType, RequireFields<MutationUpdateNoteArgs, '_id'>>;
}>;

export type NoteResolvers<ContextType = Context, ParentType extends ResolversParentTypes['Note'] = ResolversParentTypes['Note']> = ResolversObject<{
  _id: Resolver<ResolversTypes['ObjectId'], ParentType, ContextType>;
  author: Resolver<ResolversTypes['User'], ParentType, ContextType>;
  author_id: Resolver<ResolversTypes['ObjectId'], ParentType, ContextType>;
  created_on: Resolver<ResolversTypes['Timestamp'], ParentType, ContextType>;
  delta: Resolver<Maybe<ResolversTypes['JSON']>, ParentType, ContextType>;
  private: Resolver<ResolversTypes['Boolean'], ParentType, ContextType>;
  tests: Resolver<Array<ResolversTypes['Test']>, ParentType, ContextType>;
  title: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  updated_on: Resolver<ResolversTypes['Timestamp'], ParentType, ContextType>;
  variant: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export interface ObjectIdScalarConfig extends GraphQLScalarTypeConfig<ResolversTypes['ObjectId'], any> {
  name: 'ObjectId';
}

export type ProfileResolvers<ContextType = Context, ParentType extends ResolversParentTypes['Profile'] = ResolversParentTypes['Profile']> = ResolversObject<{
  _id: Resolver<ResolversTypes['ObjectId'], ParentType, ContextType>;
  email: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  image: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  name: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type QueryResolvers<ContextType = Context, ParentType extends ResolversParentTypes['Query'] = ResolversParentTypes['Query']> = ResolversObject<{
  hello: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  note: Resolver<Maybe<ResolversTypes['Note']>, ParentType, ContextType, RequireFields<QueryNoteArgs, '_id'>>;
  notes: Resolver<Array<ResolversTypes['Note']>, ParentType, ContextType>;
  profile: Resolver<Maybe<ResolversTypes['Profile']>, ParentType, ContextType>;
  submission: Resolver<Maybe<ResolversTypes['Submission']>, ParentType, ContextType, RequireFields<QuerySubmissionArgs, '_id'>>;
  test: Resolver<Maybe<ResolversTypes['Test']>, ParentType, ContextType, RequireFields<QueryTestArgs, '_id'>>;
}>;

export type SubmissionResolvers<ContextType = Context, ParentType extends ResolversParentTypes['Submission'] = ResolversParentTypes['Submission']> = ResolversObject<{
  _id: Resolver<ResolversTypes['ObjectId'], ParentType, ContextType>;
  answers: Resolver<Maybe<ResolversTypes['JSON']>, ParentType, ContextType>;
  author: Resolver<ResolversTypes['User'], ParentType, ContextType>;
  author_id: Resolver<ResolversTypes['ObjectId'], ParentType, ContextType>;
  completed_on: Resolver<Maybe<ResolversTypes['Timestamp']>, ParentType, ContextType>;
  score: Resolver<Maybe<ResolversTypes['Float']>, ParentType, ContextType>;
  started_on: Resolver<ResolversTypes['Timestamp'], ParentType, ContextType>;
  test: Resolver<ResolversTypes['Test'], ParentType, ContextType>;
  test_id: Resolver<ResolversTypes['ObjectId'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type TestResolvers<ContextType = Context, ParentType extends ResolversParentTypes['Test'] = ResolversParentTypes['Test']> = ResolversObject<{
  _id: Resolver<ResolversTypes['ObjectId'], ParentType, ContextType>;
  author: Resolver<ResolversTypes['User'], ParentType, ContextType>;
  author_id: Resolver<ResolversTypes['ObjectId'], ParentType, ContextType>;
  close_on: Resolver<Maybe<ResolversTypes['Timestamp']>, ParentType, ContextType>;
  created_on: Resolver<ResolversTypes['Timestamp'], ParentType, ContextType>;
  my_submissions: Resolver<Array<ResolversTypes['Submission']>, ParentType, ContextType>;
  note: Resolver<ResolversTypes['Note'], ParentType, ContextType>;
  note_id: Resolver<ResolversTypes['ObjectId'], ParentType, ContextType>;
  open_on: Resolver<Maybe<ResolversTypes['Timestamp']>, ParentType, ContextType>;
  title: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export interface TimestampScalarConfig extends GraphQLScalarTypeConfig<ResolversTypes['Timestamp'], any> {
  name: 'Timestamp';
}

export type UserResolvers<ContextType = Context, ParentType extends ResolversParentTypes['User'] = ResolversParentTypes['User']> = ResolversObject<{
  _id: Resolver<ResolversTypes['ObjectId'], ParentType, ContextType>;
  image: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  name: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type Resolvers<ContextType = Context> = ResolversObject<{
  JSON: GraphQLScalarType;
  Mutation: MutationResolvers<ContextType>;
  Note: NoteResolvers<ContextType>;
  ObjectId: GraphQLScalarType;
  Profile: ProfileResolvers<ContextType>;
  Query: QueryResolvers<ContextType>;
  Submission: SubmissionResolvers<ContextType>;
  Test: TestResolvers<ContextType>;
  Timestamp: GraphQLScalarType;
  User: UserResolvers<ContextType>;
}>;


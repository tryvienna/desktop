import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';

// Import a representative sample of components
import { Button } from './button';
import { Input } from './input';
import { Badge } from './badge';
import { Card, CardHeader, CardTitle, CardContent } from './card';
import { Skeleton } from './skeleton';
import { Progress } from './progress';
import { Alert, AlertTitle, AlertDescription } from './alert';
import { Separator } from './separator';
import { Label } from './label';
import { Textarea } from './textarea';
import { Spinner } from './spinner';
import { Toggle } from './toggle';
import { Tabs, TabsList, TabsTrigger, TabsContent } from './tabs';

describe('Component smoke tests', () => {
  it('renders Button', () => {
    const { container } = render(<Button>Click me</Button>);
    expect(container.textContent).toContain('Click me');
  });

  it('renders Input', () => {
    const { container } = render(<Input placeholder="Type here" />);
    expect(container.querySelector('input')).toBeTruthy();
  });

  it('renders Badge', () => {
    const { container } = render(<Badge>New</Badge>);
    expect(container.textContent).toContain('New');
  });

  it('renders Card with sub-components', () => {
    const { container } = render(
      <Card>
        <CardHeader>
          <CardTitle>Title</CardTitle>
        </CardHeader>
        <CardContent>Content</CardContent>
      </Card>
    );
    expect(container.textContent).toContain('Title');
    expect(container.textContent).toContain('Content');
  });

  it('renders Skeleton', () => {
    const { container } = render(<Skeleton className="h-4 w-full" />);
    expect(container.firstChild).toBeTruthy();
  });

  it('renders Progress', () => {
    const { container } = render(<Progress value={50} />);
    expect(container.firstChild).toBeTruthy();
  });

  it('renders Alert with sub-components', () => {
    const { container } = render(
      <Alert>
        <AlertTitle>Warning</AlertTitle>
        <AlertDescription>Something happened</AlertDescription>
      </Alert>
    );
    expect(container.textContent).toContain('Warning');
  });

  it('renders Separator', () => {
    const { container } = render(<Separator />);
    expect(container.firstChild).toBeTruthy();
  });

  it('renders Label', () => {
    const { container } = render(<Label>Email</Label>);
    expect(container.textContent).toContain('Email');
  });

  it('renders Textarea', () => {
    const { container } = render(<Textarea placeholder="Write..." />);
    expect(container.querySelector('textarea')).toBeTruthy();
  });

  it('renders Spinner', () => {
    const { container } = render(<Spinner />);
    expect(container.querySelector('svg')).toBeTruthy();
  });

  it('renders Toggle', () => {
    const { container } = render(<Toggle aria-label="Toggle">B</Toggle>);
    expect(container.textContent).toContain('B');
  });

  it('renders Tabs', () => {
    const { container } = render(
      <Tabs defaultValue="a">
        <TabsList>
          <TabsTrigger value="a">Tab A</TabsTrigger>
          <TabsTrigger value="b">Tab B</TabsTrigger>
        </TabsList>
        <TabsContent value="a">Content A</TabsContent>
        <TabsContent value="b">Content B</TabsContent>
      </Tabs>
    );
    expect(container.textContent).toContain('Tab A');
  });
});

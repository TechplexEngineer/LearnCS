int glob = 3;

void foo(int x)
{
    short bar = 23U;
    short baz;
    baz = bar;
    baz = x;
}

int main(int argc, char * argv[])
{
    int bing = 42;
    foo(17);
    bing = 43;
}

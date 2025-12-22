import os

file_path = '.env.local'

if os.path.exists(file_path):
    with open(file_path, 'r') as f:
        content = f.read()
    
    # Heuristic fix for mashed variables
    # Only target the specific keys we know might be mashed
    fixed = content
    vars_to_fix = [
        'NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY',
        'CLERK_SECRET_KEY',
        'NEXT_PUBLIC_CLERK_SIGN_IN_URL',
        'NEXT_PUBLIC_CLERK_SIGN_UP_URL',
        'NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL',
        'NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL'
    ]
    
    for var in vars_to_fix:
        # If the var is preceded by something that isn't a newline, add one
        # Simple replace: any occurrence of the var name adds a newline before it
        # But handle if it already has one to avoid double spacing? 
        # Easier: replace "VAR=" with "\nVAR=" then replace "\n\n" with "\n"
        fixed = fixed.replace(var + '=', '\n' + var + '=')
    
    # Remove excessive newlines
    while '\n\n\n' in fixed:
        fixed = fixed.replace('\n\n\n', '\n\n')
        
    with open(file_path, 'w') as f:
        f.write(fixed)
    
    print("Fixed formatting in .env.local")
else:
    print(".env.local not found")

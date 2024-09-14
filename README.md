## cashback website nodejs app

# Support Us

If you like this project, consider supporting us:

<p>
    <a href="https://www.buymeacoffee.com/hamzaaz123" target="_blank">
        <img src="https://cdn.buymeacoffee.com/buttons/v2/default-yellow.png" alt="Buy Me A Coffee" style="height: 60px; width: 217px;" />
    </a>
    <a href="https://paypal.me/iamhamza447" target="_blank">
        <img src="https://i.ibb.co/CQ4f09N/png-clipart-donate-paypal-button-tech-companies-removebg-preview.png" alt="Donate with PayPal" style="height: 60px;" />
    </a>
</p>

Mail: iamhamza112@protonmail.com


# Update the package lists
sudo apt update

# Install curl
sudo apt install curl

# Install Node.js
sudo curl -sL https://deb.nodesource.com/setup_16.x | sudo -E bash -
sudo apt install nodejs

# Install the PM2 module to run the server
sudo npm i pm2 -g

# Navigate to the script files directory
cd /home/cashback

# Install the script's modules
sudo npm install

# If there's an error installing the 'sharp' module, run this command
sudo npm install --unsafe-perm sharp

# Command to start the website server
sudo npm start

# Setup PM2 to start on boot
sudo pm2 startup

# Save the PM2 process list
sudo pm2 save

# Install SSL certificate using Certbot
sudo apt install -y certbot

# Run the following command and follow the instructions in the terminal to install SSL
sudo certbot certonly --webroot

# After successful SSL installation, open the 'bin/www' file
# Uncomment the line - process.env.NODE_ENV = "production";
# Change app.set('port', 80); to app.set('port', 443);
# Change the domain to your own - const domain = "democashback.ru";
# Restart the server
sudo pm2 update 0


# Note
Admin panel is in russian and not translated. it would be appericiated if someone translates and commits :)
